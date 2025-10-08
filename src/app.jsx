import { useState, useEffect } from 'react';
import { Upload, Brain, TrendingUp, Download, CheckCircle, XCircle, Eye, Volume2, VolumeX, Settings, Layers, Clock, BarChart3, Award, Trash2, X, Play, Pause, Zap } from 'lucide-react';

export default function App() {
  // Main State
  const [decks, setDecks] = useState([]);
  const [currentDeckId, setCurrentDeckId] = useState(null);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [mode, setMode] = useState('decks'); // decks, upload, study, stats, settings
  const [studyMode, setStudyMode] = useState('all'); // all, review, shuffle, speed, mastery
  
  // Settings State
  const [darkMode, setDarkMode] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [autoRead, setAutoRead] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [theme, setTheme] = useState('purple'); // purple, blue, green, pink
  const [dailyGoal, setDailyGoal] = useState(20);
  
  // Stats State
  const [globalStats, setGlobalStats] = useState({
    totalStudied: 0,
    totalCorrect: 0,
    totalIncorrect: 0,
    bestStreak: 0,
    currentStreak: 0,
    lastStudyDate: null,
    studyDays: []
  });
  
  const [sessionStats, setSessionStats] = useState({
    studied: 0,
    correct: 0,
    incorrect: 0,
    streak: 0
  });
  
  // UI State
  const [showSettings, setShowSettings] = useState(false);
  
  // Pomodoro State
  const [pomodoroTime, setPomodoroTime] = useState(25 * 60); // 25 minutes in seconds
  const [pomodoroActive, setPomodoroActive] = useState(false);
  const [isBreak, setIsBreak] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const savedDecks = localStorage.getItem('flashcard-decks');
    const savedStats = localStorage.getItem('flashcard-stats');
    const savedSettings = localStorage.getItem('flashcard-settings');
    
    if (savedDecks) setDecks(JSON.parse(savedDecks));
    if (savedStats) setGlobalStats(JSON.parse(savedStats));
    if (savedSettings) {
      const settings = JSON.parse(savedSettings);
      setDarkMode(settings.darkMode || false);
      setAudioEnabled(settings.audioEnabled !== undefined ? settings.audioEnabled : true);
      setAutoRead(settings.autoRead !== undefined ? settings.autoRead : true);
      setTheme(settings.theme || 'purple');
      setDailyGoal(settings.dailyGoal || 20);
    }
  }, []);

  // Save to localStorage whenever state changes
  useEffect(() => {
    if (decks.length > 0) {
      localStorage.setItem('flashcard-decks', JSON.stringify(decks));
    }
  }, [decks]);

  useEffect(() => {
    localStorage.setItem('flashcard-stats', JSON.stringify(globalStats));
  }, [globalStats]);

  useEffect(() => {
    localStorage.setItem('flashcard-settings', JSON.stringify({
      darkMode, audioEnabled, autoRead, theme, dailyGoal
    }));
  }, [darkMode, audioEnabled, autoRead, theme, dailyGoal]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (mode !== 'study') return;

      switch(e.key.toLowerCase()) {
        case ' ':
          e.preventDefault();
          setIsFlipped(!isFlipped);
          break;
        case '1':
          if (isFlipped) updateCardDifficulty(0);
          break;
        case '2':
          if (isFlipped) updateCardDifficulty(1);
          break;
        case '3':
          if (isFlipped) updateCardDifficulty(2);
          break;
        case 'r':
          const deck = decks.find(d => d.id === currentDeckId);
          if (deck) speak(isFlipped ? deck.cards[currentCardIndex].back : deck.cards[currentCardIndex].front, isFlipped);
          break;
        case 'm':
          setAudioEnabled(!audioEnabled);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [mode, isFlipped, currentCardIndex, audioEnabled, currentDeckId, decks]);

  // Pomodoro timer
  useEffect(() => {
    let interval;
    if (pomodoroActive && pomodoroTime > 0) {
      interval = setInterval(() => {
        setPomodoroTime(prev => prev - 1);
      }, 1000);
    } else if (pomodoroTime === 0) {
      speak(isBreak ? "Break time is over! Ready to study?" : "Great work! Time for a break!", false);
      setPomodoroActive(false);
      setIsBreak(!isBreak);
      setPomodoroTime(isBreak ? 25 * 60 : 5 * 60);
    }
    return () => clearInterval(interval);
  }, [pomodoroActive, pomodoroTime, isBreak]);

  // Text-to-Speech
  const speak = (text, isAnswer = false) => {
    if (!audioEnabled || !text) return;
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = isAnswer ? 1.1 : 1.0;
    utterance.volume = 1.0;
    
    const voices = window.speechSynthesis.getVoices();
    const englishVoice = voices.find(voice => voice.lang.startsWith('en'));
    if (englishVoice) utterance.voice = englishVoice;
    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    
    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  // Auto-read cards
  useEffect(() => {
    if (mode === 'study' && autoRead && !isFlipped) {
      const deck = decks.find(d => d.id === currentDeckId);
      if (deck) {
        const card = deck.cards[currentCardIndex];
        setTimeout(() => speak(card.front, false), 300);
      }
    }
    return () => stopSpeaking();
  }, [currentCardIndex, mode, autoRead, isFlipped, currentDeckId, decks]);

  useEffect(() => {
    if (isFlipped && autoRead) {
      const deck = decks.find(d => d.id === currentDeckId);
      if (deck) {
        const card = deck.cards[currentCardIndex];
        setTimeout(() => speak(card.back, true), 300);
      }
    }
  }, [isFlipped, autoRead, currentDeckId, currentCardIndex, decks]);

  // Parse CSV file
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const lines = text.split('\n').filter(line => line.trim());
      const startIndex = lines[0].toLowerCase().includes('front') ? 1 : 0;
      
      const cards = lines.slice(startIndex).map((line, index) => {
        const [front, back] = line.split('|').map(s => s.trim());
        return {
          id: Date.now() + index,
          front: front || '',
          back: back || '',
          easiness: 2.5,
          interval: 1,
          repetitions: 0,
          nextReview: Date.now(),
          lastReviewed: null,
          mastery: 0 // 0-100
        };
      }).filter(card => card.front && card.back);

      const newDeck = {
        id: Date.now(),
        name: file.name.replace(/\.(txt|csv)$/, ''),
        cards: cards,
        createdAt: Date.now(),
        lastStudied: null
      };

      setDecks([...decks, newDeck]);
      setCurrentDeckId(newDeck.id);
      setCurrentCardIndex(0);
      setMode('study');
      setSessionStats({ studied: 0, correct: 0, incorrect: 0, streak: 0 });
      setIsFlipped(false);
    };
    reader.readAsText(file);
  };

  // Update daily streak
  const updateDailyStreak = () => {
    const today = new Date().toDateString();
    const lastStudy = globalStats.lastStudyDate ? new Date(globalStats.lastStudyDate).toDateString() : null;
    
    if (lastStudy !== today) {
      const yesterday = new Date(Date.now() - 86400000).toDateString();
      const newStreak = lastStudy === yesterday ? globalStats.currentStreak + 1 : 1;
      
      setGlobalStats(prev => ({
        ...prev,
        currentStreak: newStreak,
        bestStreak: Math.max(prev.bestStreak, newStreak),
        lastStudyDate: Date.now(),
        studyDays: [...new Set([...prev.studyDays, today])]
      }));
    }
  };

  // Spaced repetition algorithm
  const updateCardDifficulty = (rating) => {
    stopSpeaking();
    updateDailyStreak();
    
    const deck = decks.find(d => d.id === currentDeckId);
    const card = deck.cards[currentCardIndex];
    let { easiness, interval, repetitions, mastery } = card;

    if (rating === 0) {
      repetitions = 0;
      interval = 1;
      mastery = Math.max(0, mastery - 15);
      setSessionStats(prev => ({
        ...prev,
        studied: prev.studied + 1,
        incorrect: prev.incorrect + 1,
        streak: 0
      }));
      setGlobalStats(prev => ({
        ...prev,
        totalStudied: prev.totalStudied + 1,
        totalIncorrect: prev.totalIncorrect + 1
      }));
    } else {
      repetitions += 1;
      easiness = Math.max(1.3, easiness + (0.1 - (2 - rating) * (0.08 + (2 - rating) * 0.02)));
      mastery = Math.min(100, mastery + (rating === 2 ? 20 : 10));
      
      if (repetitions === 1) interval = 1;
      else if (repetitions === 2) interval = 6;
      else interval = Math.round(interval * easiness);

      setSessionStats(prev => ({
        ...prev,
        studied: prev.studied + 1,
        correct: prev.correct + 1,
        streak: prev.streak + 1
      }));
      setGlobalStats(prev => ({
        ...prev,
        totalStudied: prev.totalStudied + 1,
        totalCorrect: prev.totalCorrect + 1
      }));
    }

    const updatedDecks = decks.map(d => {
      if (d.id === currentDeckId) {
        const updatedCards = [...d.cards];
        updatedCards[currentCardIndex] = {
          ...card,
          easiness,
          interval,
          repetitions,
          mastery,
          nextReview: Date.now() + interval * 24 * 60 * 60 * 1000,
          lastReviewed: Date.now()
        };
        return { ...d, cards: updatedCards, lastStudied: Date.now() };
      }
      return d;
    });

    setDecks(updatedDecks);
    setIsFlipped(false);

    const filteredCards = getFilteredCards(updatedDecks.find(d => d.id === currentDeckId));
    if (currentCardIndex < filteredCards.length - 1) {
      setCurrentCardIndex(currentCardIndex + 1);
    } else {
      setMode('stats');
    }
  };

  // Get filtered cards based on study mode
  const getFilteredCards = (deck) => {
    if (!deck) return [];
    let filtered = [...deck.cards];
    
    switch(studyMode) {
      case 'review':
        filtered = filtered.filter(c => c.mastery < 60);
        break;
      case 'shuffle':
        filtered = filtered.sort(() => Math.random() - 0.5);
        break;
      case 'mastery':
        filtered = filtered.filter(c => c.mastery < 80);
        break;
    }
    
    return filtered;
  };

  const currentDeck = decks.find(d => d.id === currentDeckId);
  const filteredCards = currentDeck ? getFilteredCards(currentDeck) : [];

  // Export functions
  const exportProgress = () => {
    const data = {
      decks: decks,
      stats: globalStats,
      exportDate: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `flashcard-progress-${Date.now()}.json`;
    a.click();
  };

  const downloadTemplate = () => {
    const template = `Front | Back
What is Big O notation? | A way to describe how runtime grows as input size increases
What does O(1) mean? | Constant time - same time regardless of input size
What does LIFO stand for? | Last In First Out`;
    
    const blob = new Blob([template], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'flashcard_template.txt';
    a.click();
  };

  // Delete deck
  const deleteDeck = (deckId) => {
    if (confirm('Are you sure you want to delete this deck?')) {
      setDecks(decks.filter(d => d.id !== deckId));
      if (currentDeckId === deckId) {
        setCurrentDeckId(null);
        setMode('decks');
      }
    }
  };

  // Theme colors
  const themeColors = {
    purple: 'from-purple-600 via-blue-600 to-cyan-500',
    blue: 'from-blue-600 via-indigo-600 to-purple-500',
    green: 'from-green-600 via-teal-600 to-blue-500',
    pink: 'from-pink-600 via-rose-600 to-red-500'
  };

  const bgClass = darkMode ? 'bg-gray-900' : `bg-gradient-to-br ${themeColors[theme]}`;
  const cardBg = darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800';
  const textColor = darkMode ? 'text-white' : 'text-white';

  // Format time for pomodoro
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Settings Modal
  if (showSettings) {
    return (
      <div className={`min-h-screen ${bgClass} flex items-center justify-center p-4`}>
        <div className={`max-w-2xl w-full ${cardBg} rounded-3xl shadow-2xl p-8`}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-3xl font-bold flex items-center gap-2">
              <Settings className="w-8 h-8" />
              Settings
            </h2>
            <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="space-y-6">
            {/* Theme Selection */}
            <div>
              <label className="block font-semibold mb-3">Theme Color</label>
              <div className="grid grid-cols-4 gap-3">
                {['purple', 'blue', 'green', 'pink'].map(t => (
                  <button
                    key={t}
                    onClick={() => setTheme(t)}
                    className={`h-20 rounded-xl bg-gradient-to-br ${themeColors[t]} ${theme === t ? 'ring-4 ring-offset-2 ring-blue-500' : ''}`}
                  />
                ))}
              </div>
            </div>

            {/* Dark Mode */}
            <div className="flex items-center justify-between">
              <span className="font-semibold">Dark Mode</span>
              <button
                onClick={() => setDarkMode(!darkMode)}
                className={`w-14 h-8 rounded-full transition-colors ${darkMode ? 'bg-blue-500' : 'bg-gray-300'} relative`}
              >
                <div className={`w-6 h-6 bg-white rounded-full absolute top-1 transition-transform ${darkMode ? 'translate-x-7' : 'translate-x-1'}`} />
              </button>
            </div>

            {/* Daily Goal */}
            <div>
              <label className="block font-semibold mb-2">Daily Card Goal: {dailyGoal}</label>
              <input
                type="range"
                min="5"
                max="100"
                value={dailyGoal}
                onChange={(e) => setDailyGoal(Number(e.target.value))}
                className="w-full"
              />
            </div>

            {/* Audio Settings */}
            <div className="flex items-center justify-between">
              <span className="font-semibold">Audio Enabled</span>
              <button
                onClick={() => setAudioEnabled(!audioEnabled)}
                className={`w-14 h-8 rounded-full transition-colors ${audioEnabled ? 'bg-blue-500' : 'bg-gray-300'} relative`}
              >
                <div className={`w-6 h-6 bg-white rounded-full absolute top-1 transition-transform ${audioEnabled ? 'translate-x-7' : 'translate-x-1'}`} />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <span className="font-semibold">Auto-read Cards</span>
              <button
                onClick={() => setAutoRead(!autoRead)}
                className={`w-14 h-8 rounded-full transition-colors ${autoRead ? 'bg-blue-500' : 'bg-gray-300'} relative`}
              >
                <div className={`w-6 h-6 bg-white rounded-full absolute top-1 transition-transform ${autoRead ? 'translate-x-7' : 'translate-x-1'}`} />
              </button>
            </div>

            {/* Export Data */}
            <button
              onClick={exportProgress}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold py-4 rounded-2xl hover:scale-105 transition-all flex items-center justify-center gap-2"
            >
              <Download className="w-5 h-5" />
              Export All Progress
            </button>

            {/* Keyboard Shortcuts */}
            <div className={`${darkMode ? 'bg-gray-700' : 'bg-gray-100'} rounded-xl p-4`}>
              <h3 className="font-bold mb-3">⌨️ Keyboard Shortcuts</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Flip Card</span>
                  <kbd className="px-2 py-1 bg-gray-300 dark:bg-gray-600 rounded">Space</kbd>
                </div>
                <div className="flex justify-between">
                  <span>Hard / Good / Easy</span>
                  <div className="space-x-2">
                    <kbd className="px-2 py-1 bg-gray-300 dark:bg-gray-600 rounded">1</kbd>
                    <kbd className="px-2 py-1 bg-gray-300 dark:bg-gray-600 rounded">2</kbd>
                    <kbd className="px-2 py-1 bg-gray-300 dark:bg-gray-600 rounded">3</kbd>
                  </div>
                </div>
                <div className="flex justify-between">
                  <span>Repeat Audio</span>
                  <kbd className="px-2 py-1 bg-gray-300 dark:bg-gray-600 rounded">R</kbd>
                </div>
                <div className="flex justify-between">
                  <span>Mute/Unmute</span>
                  <kbd className="px-2 py-1 bg-gray-300 dark:bg-gray-600 rounded">M</kbd>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Decks Management Screen
  if (mode === 'decks') {
    const todayStudied = globalStats.lastStudyDate && new Date(globalStats.lastStudyDate).toDateString() === new Date().toDateString()
      ? decks.reduce((sum, deck) => sum + (deck.lastStudied && new Date(deck.lastStudied).toDateString() === new Date().toDateString() ? deck.cards.filter(c => c.lastReviewed && new Date(c.lastReviewed).toDateString() === new Date().toDateString()).length : 0), 0)
      : 0;
    
    return (
      <div className={`min-h-screen ${bgClass} p-4`}>
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className={`${cardBg} rounded-3xl shadow-xl p-6 mb-6`}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-4xl font-bold flex items-center gap-3">
                  <Brain className="w-10 h-10" />
                  Java DSA Master
                </h1>
                <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'} mt-2`}>
                  Your personal spaced repetition learning system
                </p>
              </div>
              <button
                onClick={() => setShowSettings(true)}
                className={`p-3 ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} rounded-xl transition-all`}
              >
                <Settings className="w-6 h-6" />
              </button>
            </div>

            {/* Daily Goal Progress */}
            <div className={`${darkMode ? 'bg-gray-700' : 'bg-gradient-to-r from-purple-100 to-blue-100'} rounded-2xl p-4`}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold flex items-center gap-2">
                  <Zap className="w-5 h-5 text-yellow-500" />
                  Daily Goal: {todayStudied}/{dailyGoal} cards
                </span>
                <span className="text-2xl">{todayStudied >= dailyGoal ? '🎉' : '💪'}</span>
              </div>
              <div className={`w-full ${darkMode ? 'bg-gray-600' : 'bg-white'} rounded-full h-4 overflow-hidden`}>
                <div
                  className="bg-gradient-to-r from-green-400 to-blue-500 h-full transition-all duration-500"
                  style={{ width: `${Math.min((todayStudied / dailyGoal) * 100, 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className={`${cardBg} rounded-2xl p-6 text-center`}>
              <div className="text-3xl mb-2">🔥</div>
              <div className="text-3xl font-bold">{globalStats.currentStreak}</div>
              <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Day Streak</div>
            </div>
            <div className={`${cardBg} rounded-2xl p-6 text-center`}>
              <div className="text-3xl mb-2">📚</div>
              <div className="text-3xl font-bold">{decks.length}</div>
              <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Total Decks</div>
            </div>
            <div className={`${cardBg} rounded-2xl p-6 text-center`}>
              <div className="text-3xl mb-2">✅</div>
              <div className="text-3xl font-bold">{globalStats.totalStudied}</div>
              <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Cards Studied</div>
            </div>
            <div className={`${cardBg} rounded-2xl p-6 text-center`}>
              <div className="text-3xl mb-2">🎯</div>
              <div className="text-3xl font-bold">
                {globalStats.totalStudied > 0 ? Math.round((globalStats.totalCorrect / globalStats.totalStudied) * 100) : 0}%
              </div>
              <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Accuracy</div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <button
              onClick={() => setMode('upload')}
              className={`${cardBg} rounded-2xl p-6 hover:scale-105 transition-all flex items-center gap-4`}
            >
              <div className="bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl p-4">
                <Upload className="w-8 h-8 text-white" />
              </div>
              <div className="text-left">
                <div className="font-bold text-xl">Upload New Deck</div>
                <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Import flashcards from CSV/TXT</div>
              </div>
            </button>

            <button
              onClick={() => setMode('stats')}
              className={`${cardBg} rounded-2xl p-6 hover:scale-105 transition-all flex items-center gap-4`}
            >
              <div className="bg-gradient-to-br from-green-500 to-teal-500 rounded-xl p-4">
                <BarChart3 className="w-8 h-8 text-white" />
              </div>
              <div className="text-left">
                <div className="font-bold text-xl">View Statistics</div>
                <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Detailed analytics & progress</div>
              </div>
            </button>
          </div>

          {/* Deck List */}
          <div className={`${cardBg} rounded-3xl shadow-xl p-6`}>
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <Layers className="w-6 h-6" />
              Your Decks
            </h2>

            {decks.length === 0 ? (
              <div className="text-center py-12">
                <Brain className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className={`text-lg ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  No decks yet. Upload your first deck to get started!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {decks.map(deck => {
                  const avgMastery = deck.cards.reduce((sum, c) => sum + c.mastery, 0) / deck.cards.length;
                  return (
                    <div
                      key={deck.id}
                      className={`${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'} rounded-xl p-5 transition-all cursor-pointer`}
                      onClick={() => {
                        setCurrentDeckId(deck.id);
                        setCurrentCardIndex(0);
                        setMode('study');
                        setSessionStats({ studied: 0, correct: 0, incorrect: 0, streak: 0 });
                      }}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="font-bold text-lg mb-1">{deck.name}</h3>
                          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            {deck.cards.length} cards • {Math.round(avgMastery)}% mastery
                          </p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteDeck(deck.id);
                          }}
                          className="p-2 hover:bg-red-100 dark:hover:bg-red-900 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                      
                      <div className={`w-full ${darkMode ? 'bg-gray-600' : 'bg-white'} rounded-full h-2 mb-3`}>
                        <div
                          className="bg-gradient-to-r from-green-400 to-blue-500 h-full rounded-full"
                          style={{ width: `${avgMastery}%` }}
                        />
                      </div>

                      <div className="flex gap-2 text-xs">
                        <span className={`px-3 py-1 ${darkMode ? 'bg-gray-600' : 'bg-white'} rounded-full`}>
                          📚 {deck.cards.filter(c => c.mastery >= 80).length} mastered
                        </span>
                        <span className={`px-3 py-1 ${darkMode ? 'bg-gray-600' : 'bg-white'} rounded-full`}>
                          📖 {deck.cards.filter(c => c.mastery < 60).length} learning
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Upload Screen
  if (mode === 'upload') {
    return (
      <div className={`min-h-screen ${bgClass} flex items-center justify-center p-4`}>
        <div className="max-w-2xl w-full">
          <button
            onClick={() => setMode('decks')}
            className={`mb-4 ${textColor} flex items-center gap-2 hover:underline`}
          >
            ← Back to Decks
          </button>

          <div className={`${cardBg} rounded-3xl shadow-2xl p-8`}>
            <h2 className="text-2xl font-bold mb-6 flex items-center">
              <Upload className="w-6 h-6 mr-2" />
              Upload New Deck
            </h2>

            <div className={`border-4 border-dashed ${darkMode ? 'border-gray-600 hover:border-gray-500' : 'border-purple-300 hover:border-purple-500'} rounded-2xl p-12 text-center transition-colors cursor-pointer`}>
              <input
                type="file"
                accept=".txt,.csv"
                onChange={handleFileUpload}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <Upload className={`w-16 h-16 mx-auto ${darkMode ? 'text-gray-500' : 'text-purple-400'} mb-4`} />
                <p className="text-lg font-semibold mb-2">
                  Drop your CSV/TXT file here or click to browse
                </p>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Format: Front | Back (one card per line)
                </p>
              </label>
            </div>

            <div className="mt-6 flex items-center justify-center">
              <button
                onClick={downloadTemplate}
                className={`flex items-center gap-2 ${darkMode ? 'text-blue-400 hover:text-blue-300' : 'text-purple-600 hover:text-purple-700'} font-medium`}
              >
                <Download className="w-5 h-5" />
                Download Template File
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Study Screen
  if (mode === 'study' && currentDeck) {
    const card = filteredCards[currentCardIndex];
    const progress = ((currentCardIndex + 1) / filteredCards.length) * 100;

    return (
      <div className={`min-h-screen ${bgClass} flex items-center justify-center p-4`}>
        <div className="max-w-4xl w-full">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => {
                  stopSpeaking();
                  setMode('decks');
                }}
                className={`${textColor} flex items-center gap-2 hover:underline`}
              >
                ← Back
              </button>

              <div className={textColor}>
                <p className="text-sm opacity-75">Current Streak</p>
                <p className="text-3xl font-bold">🔥 {sessionStats.streak}</p>
              </div>

              <div className={`${textColor} text-center`}>
                <p className="text-lg font-semibold">
                  Card {currentCardIndex + 1} of {filteredCards.length}
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setAudioEnabled(!audioEnabled)}
                  className={`${audioEnabled ? 'bg-white/20 hover:bg-white/30' : 'bg-red-500/50 hover:bg-red-500/70'} ${textColor} rounded-full p-3 transition-all`}
                >
                  {audioEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                </button>
                <button
                  onClick={() => setShowSettings(true)}
                  className={`bg-white/20 hover:bg-white/30 ${textColor} rounded-full p-3 transition-all`}
                >
                  <Settings className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-white/20 rounded-full h-3 overflow-hidden mb-4">
              <div
                className="bg-gradient-to-r from-green-400 to-blue-400 h-full transition-all duration-500 rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>

            {/* Study Mode Selector */}
            <div className="flex gap-2 justify-center mb-4">
              {['all', 'review', 'shuffle', 'mastery'].map(m => (
                <button
                  key={m}
                  onClick={() => {
                    setStudyMode(m);
                    setCurrentCardIndex(0);
                  }}
                  className={`px-4 py-2 rounded-xl ${studyMode === m ? 'bg-white text-purple-600' : 'bg-white/20 text-white'} font-medium capitalize transition-all`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Pomodoro Timer */}
          <div className={`${cardBg} rounded-2xl p-4 mb-4 flex items-center justify-between`}>
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5" />
              <span className="font-medium">Pomodoro: {formatTime(pomodoroTime)}</span>
              <span className="text-sm opacity-75">{isBreak ? '☕ Break' : '📚 Study'}</span>
            </div>
            <button
              onClick={() => setPomodoroActive(!pomodoroActive)}
              className={`${pomodoroActive ? 'bg-red-500' : 'bg-green-500'} text-white px-4 py-2 rounded-lg flex items-center gap-2`}
            >
              {pomodoroActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {pomodoroActive ? 'Pause' : 'Start'}
            </button>
          </div>

          {/* Audio Controls */}
          <div className={`${cardBg} rounded-2xl p-4 mb-4 flex items-center justify-between`}>
            <div className="flex items-center gap-3">
              <Volume2 className="w-5 h-5" />
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoRead}
                  onChange={(e) => setAutoRead(e.target.checked)}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm font-medium">Auto-read</span>
              </label>
            </div>
            <button
              onClick={() => speak(isFlipped ? card.back : card.front, isFlipped)}
              disabled={!audioEnabled}
              className={`${isSpeaking ? 'bg-green-500' : 'bg-gray-500'} hover:bg-gray-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg transition-all text-sm font-medium`}
            >
              {isSpeaking ? '🔊 Speaking...' : '🔊 Repeat'}
            </button>
          </div>

          {/* Flashcard */}
          <div className="perspective mb-6">
            <div
              className={`relative w-full h-96 transition-transform duration-500 transform-style-3d cursor-pointer ${isFlipped ? 'rotate-y-180' : ''}`}
              onClick={() => setIsFlipped(!isFlipped)}
            >
              {/* Front */}
              <div className="absolute w-full h-full backface-hidden">
                <div className={`${cardBg} rounded-3xl shadow-2xl p-12 h-full flex flex-col items-center justify-center`}>
                  <div className="text-sm font-semibold mb-4 flex items-center gap-2 opacity-75">
                    <Eye className="w-4 h-4" />
                    Click to reveal answer • Press Space
                  </div>
                  <p className="text-3xl font-bold text-center leading-relaxed mb-4">
                    {card.front}
                  </p>
                  <div className="flex gap-2 text-xs mt-4">
                    <span className={`px-3 py-1 ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} rounded-full`}>
                      Mastery: {Math.round(card.mastery)}%
                    </span>
                    <span className={`px-3 py-1 ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} rounded-full`}>
                      Reps: {card.repetitions}
                    </span>
                  </div>
                </div>
              </div>

              {/* Back */}
              <div className="absolute w-full h-full backface-hidden rotate-y-180">
                <div className="bg-gradient-to-br from-purple-500 to-blue-500 rounded-3xl shadow-2xl p-12 h-full flex flex-col items-center justify-center text-white">
                  <div className="text-sm font-semibold mb-4 opacity-90 flex items-center gap-2">
                    {audioEnabled && <Volume2 className="w-4 h-4" />}
                    ✨ Answer
                  </div>
                  <p className="text-2xl font-semibold text-center leading-relaxed">
                    {card.back}
                  </p>
                  <div className="mt-6 text-sm opacity-75">
                    Rate your knowledge below • Keys: 1, 2, 3
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Rating Buttons */}
          {isFlipped && (
            <div className="grid grid-cols-3 gap-4 animate-fadeIn">
              <button
                onClick={() => updateCardDifficulty(0)}
                className="bg-red-500 hover:bg-red-600 text-white font-bold py-6 px-6 rounded-2xl shadow-lg transform hover:scale-105 transition-all"
              >
                <XCircle className="w-8 h-8 mx-auto mb-2" />
                <div className="text-lg">Hard</div>
                <div className="text-xs opacity-75 mt-1">Press 1</div>
              </button>
              <button
                onClick={() => updateCardDifficulty(1)}
                className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-6 px-6 rounded-2xl shadow-lg transform hover:scale-105 transition-all"
              >
                <CheckCircle className="w-8 h-8 mx-auto mb-2" />
                <div className="text-lg">Good</div>
                <div className="text-xs opacity-75 mt-1">Press 2</div>
              </button>
              <button
                onClick={() => updateCardDifficulty(2)}
                className="bg-green-500 hover:bg-green-600 text-white font-bold py-6 px-6 rounded-2xl shadow-lg transform hover:scale-105 transition-all"
              >
                <CheckCircle className="w-8 h-8 mx-auto mb-2" />
                <div className="text-lg">Easy</div>
                <div className="text-xs opacity-75 mt-1">Press 3</div>
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Stats Screen
  if (mode === 'stats') {
    const accuracy = globalStats.totalStudied > 0 ? Math.round((globalStats.totalCorrect / globalStats.totalStudied) * 100) : 0;
    const sessionAccuracy = sessionStats.studied > 0 ? Math.round((sessionStats.correct / sessionStats.studied) * 100) : 0;

    return (
      <div className={`min-h-screen ${bgClass} p-4`}>
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => setMode('decks')}
            className={`mb-4 ${textColor} flex items-center gap-2 hover:underline`}
          >
            ← Back to Decks
          </button>

          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-white rounded-full mb-6 shadow-2xl">
              <TrendingUp className="w-12 h-12 text-green-500" />
            </div>
            <h1 className={`text-5xl font-bold ${textColor} mb-2`}>Statistics & Progress 📊</h1>
          </div>

          {/* Session Stats */}
          {sessionStats.studied > 0 && (
            <div className={`${cardBg} rounded-3xl shadow-2xl p-8 mb-6`}>
              <h2 className="text-2xl font-bold mb-6">This Session</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="text-4xl font-bold text-purple-600 mb-2">{sessionStats.studied}</div>
                  <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'} font-medium`}>Cards Studied</div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold text-green-600 mb-2">{sessionStats.correct}</div>
                  <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'} font-medium`}>Correct</div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold text-red-600 mb-2">{sessionStats.incorrect}</div>
                  <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'} font-medium`}>To Review</div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold text-blue-600 mb-2">{sessionAccuracy}%</div>
                  <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'} font-medium`}>Accuracy</div>
                </div>
              </div>
            </div>
          )}

          {/* All-Time Stats */}
          <div className={`${cardBg} rounded-3xl shadow-2xl p-8 mb-6`}>
            <h2 className="text-2xl font-bold mb-6">All-Time Statistics</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
              <div className="text-center">
                <div className="text-4xl font-bold text-purple-600 mb-2">{globalStats.totalStudied}</div>
                <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'} font-medium`}>Total Cards</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-green-600 mb-2">{globalStats.totalCorrect}</div>
                <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'} font-medium`}>Total Correct</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-red-600 mb-2">{globalStats.totalIncorrect}</div>
                <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'} font-medium`}>Total Incorrect</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-blue-600 mb-2">{accuracy}%</div>
                <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'} font-medium`}>Overall Accuracy</div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className={`${darkMode ? 'bg-gray-700' : 'bg-gradient-to-r from-purple-100 to-blue-100'} rounded-2xl p-6`}>
              <div className="flex items-center justify-between mb-4">
                <span className="text-lg font-semibold">Performance Breakdown</span>
                <span className="text-3xl">📊</span>
              </div>
              <div className="flex gap-2 h-12">
                <div
                  className="bg-green-500 rounded-lg flex items-center justify-center text-white font-bold transition-all"
                  style={{ width: `${globalStats.totalStudied > 0 ? (globalStats.totalCorrect / globalStats.totalStudied) * 100 : 0}%` }}
                >
                  {globalStats.totalCorrect > 0 && '✓'}
                </div>
                <div
                  className="bg-red-500 rounded-lg flex items-center justify-center text-white font-bold transition-all"
                  style={{ width: `${globalStats.totalStudied > 0 ? (globalStats.totalIncorrect / globalStats.totalStudied) * 100 : 0}%` }}
                >
                  {globalStats.totalIncorrect > 0 && '✗'}
                </div>
              </div>
            </div>
          </div>

          {/* Achievements */}
          <div className={`${cardBg} rounded-3xl shadow-2xl p-8 mb-6`}>
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <Award className="w-6 h-6" />
              Achievements
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-300 dark:border-yellow-700 rounded-xl p-6 text-center">
                <div className="text-4xl mb-3">🔥</div>
                <div className="text-3xl font-bold text-yellow-700 dark:text-yellow-400 mb-1">{globalStats.currentStreak}</div>
                <div className="text-sm text-yellow-600 dark:text-yellow-500 font-medium">Current Streak</div>
                <div className="text-xs text-yellow-600 dark:text-yellow-500 mt-2">Best: {globalStats.bestStreak} days</div>
              </div>
              <div className="bg-purple-50 dark:bg-purple-900/20 border-2 border-purple-300 dark:border-purple-700 rounded-xl p-6 text-center">
                <div className="text-4xl mb-3">📚</div>
                <div className="text-3xl font-bold text-purple-700 dark:text-purple-400 mb-1">{decks.length}</div>
                <div className="text-sm text-purple-600 dark:text-purple-500 font-medium">Decks Created</div>
                <div className="text-xs text-purple-600 dark:text-purple-500 mt-2">
                  {decks.reduce((sum, d) => sum + d.cards.length, 0)} total cards
                </div>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-300 dark:border-blue-700 rounded-xl p-6 text-center">
                <div className="text-4xl mb-3">🎯</div>
                <div className="text-3xl font-bold text-blue-700 dark:text-blue-400 mb-1">{globalStats.studyDays.length}</div>
                <div className="text-sm text-blue-600 dark:text-blue-500 font-medium">Study Days</div>
                <div className="text-xs text-blue-600 dark:text-blue-500 mt-2">Keep the streak alive!</div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => setMode('decks')}
              className={`${cardBg} hover:scale-105 font-bold py-4 px-6 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2`}
            >
              <Layers className="w-6 h-6" />
              Back to Decks
            </button>
            <button
              onClick={exportProgress}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold py-4 px-6 rounded-2xl shadow-lg transform hover:scale-105 transition-all flex items-center justify-center gap-2"
            >
              <Download className="w-6 h-6" />
              Export Progress
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}