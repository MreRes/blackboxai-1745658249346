import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Education = () => {
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedLevel, setSelectedLevel] = useState('basic');
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [progress, setProgress] = useState({});
  const [quizMode, setQuizMode] = useState(false);
  const [currentQuiz, setCurrentQuiz] = useState(null);

  useEffect(() => {
    fetchEducationContent();
    fetchUserProgress();
  }, [selectedLevel]);

  const fetchEducationContent = async () => {
    try {
      const response = await axios.get(`/api/education/content?level=${selectedLevel}`);
      setContent(response.data);
      setLoading(false);
    } catch (err) {
      setError('Gagal memuat konten edukasi');
      setLoading(false);
    }
  };

  const fetchUserProgress = async () => {
    try {
      const response = await axios.get('/api/education/progress');
      setProgress(response.data);
    } catch (err) {
      console.error('Gagal memuat progress pembelajaran:', err);
    }
  };

  const startQuiz = async (topicId) => {
    try {
      const response = await axios.get(`/api/education/quiz/${topicId}`);
      setCurrentQuiz(response.data);
      setQuizMode(true);
    } catch (err) {
      console.error('Gagal memuat quiz:', err);
    }
  };

  const submitQuizAnswer = async (questionId, answer) => {
    try {
      await axios.post('/api/education/quiz/answer', {
        questionId,
        answer
      });
      // Update progress after answering
      fetchUserProgress();
    } catch (err) {
      console.error('Gagal mengirim jawaban:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Edukasi Keuangan</h1>
        <div className="mt-3 sm:mt-0">
          <select
            value={selectedLevel}
            onChange={(e) => setSelectedLevel(e.target.value)}
            className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          >
            <option value="basic">Dasar</option>
            <option value="intermediate">Menengah</option>
            <option value="advanced">Lanjutan</option>
          </select>
        </div>
      </div>

      {/* Learning Progress */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Progress Pembelajaran</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-indigo-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="text-indigo-600">
                <p className="text-sm font-medium">Modul Selesai</p>
                <p className="text-2xl font-bold">{progress.completedModules || 0}</p>
              </div>
              <div className="h-12 w-12 bg-indigo-100 rounded-full flex items-center justify-center">
                <i className="fas fa-book-reader text-indigo-600 text-xl"></i>
              </div>
            </div>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="text-green-600">
                <p className="text-sm font-medium">Quiz Berhasil</p>
                <p className="text-2xl font-bold">{progress.passedQuizzes || 0}</p>
              </div>
              <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
                <i className="fas fa-check-circle text-green-600 text-xl"></i>
              </div>
            </div>
          </div>
          <div className="bg-yellow-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="text-yellow-600">
                <p className="text-sm font-medium">Level Saat Ini</p>
                <p className="text-2xl font-bold capitalize">{selectedLevel}</p>
              </div>
              <div className="h-12 w-12 bg-yellow-100 rounded-full flex items-center justify-center">
                <i className="fas fa-star text-yellow-600 text-xl"></i>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Learning Paths */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <h2 className="text-lg font-medium text-gray-900">Jalur Pembelajaran</h2>
          <div className="mt-4 space-y-4">
            {content?.paths.map((path, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-medium text-gray-900">{path.title}</h3>
                    <p className="mt-1 text-sm text-gray-500">{path.description}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500">
                      {path.completedTopics} / {path.totalTopics} selesai
                    </span>
                    <button
                      onClick={() => setSelectedTopic(path)}
                      className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-full text-indigo-700 bg-indigo-100 hover:bg-indigo-200"
                    >
                      {path.completed ? 'Ulangi' : 'Mulai'}
                    </button>
                  </div>
                </div>
                {/* Progress bar */}
                <div className="mt-4">
                  <div className="relative pt-1">
                    <div className="overflow-hidden h-2 text-xs flex rounded bg-indigo-200">
                      <div
                        style={{ width: `${(path.completedTopics / path.totalTopics) * 100}%` }}
                        className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-indigo-500"
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Selected Topic Content */}
      {selectedTopic && !quizMode && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-medium text-gray-900">{selectedTopic.title}</h2>
            <button
              onClick={() => setSelectedTopic(null)}
              className="text-gray-400 hover:text-gray-500"
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
          <div className="prose max-w-none">
            {selectedTopic.content}
          </div>
          <div className="mt-6 flex justify-end">
            <button
              onClick={() => startQuiz(selectedTopic.id)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
            >
              Mulai Quiz
            </button>
          </div>
        </div>
      )}

      {/* Quiz Mode */}
      {quizMode && currentQuiz && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-medium text-gray-900">Quiz: {currentQuiz.title}</h2>
            <button
              onClick={() => {
                setQuizMode(false);
                setCurrentQuiz(null);
              }}
              className="text-gray-400 hover:text-gray-500"
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
          <div className="space-y-6">
            {currentQuiz.questions.map((question, index) => (
              <div key={index} className="bg-gray-50 rounded-lg p-4">
                <p className="text-base font-medium text-gray-900 mb-4">{question.text}</p>
                <div className="space-y-2">
                  {question.options.map((option, optIndex) => (
                    <button
                      key={optIndex}
                      onClick={() => submitQuizAnswer(question.id, option)}
                      className="w-full text-left px-4 py-2 border rounded-md hover:bg-gray-100"
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Financial Tips */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Tips Keuangan Hari Ini</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {content?.tips.map((tip, index) => (
            <div key={index} className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-indigo-100">
                    <i className={`fas fa-${tip.icon} text-indigo-600`}></i>
                  </span>
                </div>
                <div className="ml-4">
                  <h3 className="text-sm font-medium text-gray-900">{tip.title}</h3>
                  <p className="mt-1 text-sm text-gray-500">{tip.content}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Education;
