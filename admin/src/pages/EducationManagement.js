import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Tab } from '@headlessui/react';

const EducationManagement = () => {
  const [content, setContent] = useState({
    lessons: [],
    tips: [],
    quizzes: []
  });
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState('lesson');
  const [formData, setFormData] = useState({
    type: 'lesson',
    title: '',
    content: '',
    level: 'basic',
    category: '',
    order: 0
  });

  useEffect(() => {
    fetchEducationContent();
  }, []);

  const fetchEducationContent = async () => {
    try {
      const response = await axios.get('/api/admin/education');
      setContent(response.data);
      setLoading(false);
    } catch (err) {
      toast.error('Gagal memuat konten edukasi');
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/admin/education', formData);
      toast.success('Konten berhasil ditambahkan');
      setShowForm(false);
      fetchEducationContent();
    } catch (err) {
      toast.error('Gagal menambahkan konten');
    }
  };

  const handleDelete = async (id, type) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus konten ini?')) {
      try {
        await axios.delete(`/api/admin/education/${type}/${id}`);
        toast.success('Konten berhasil dihapus');
        fetchEducationContent();
      } catch (err) {
        toast.error('Gagal menghapus konten');
      }
    }
  };

  const handleEdit = async (item, type) => {
    setFormType(type);
    setFormData({
      ...item,
      type
    });
    setShowForm(true);
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
        <h1 className="text-2xl font-semibold text-gray-900">Manajemen Konten Edukasi</h1>
        <div className="mt-3 sm:mt-0">
          <button
            onClick={() => {
              setFormData({
                type: 'lesson',
                title: '',
                content: '',
                level: 'basic',
                category: '',
                order: 0
              });
              setShowForm(true);
            }}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
          >
            Tambah Konten
          </button>
        </div>
      </div>

      {/* Content Tabs */}
      <div className="bg-white shadow rounded-lg">
        <Tab.Group selectedIndex={selectedTab} onChange={setSelectedTab}>
          <Tab.List className="flex border-b border-gray-200">
            <Tab
              className={({ selected }) =>
                `${
                  selected
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } flex-1 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm text-center`
              }
            >
              Materi Pembelajaran
            </Tab>
            <Tab
              className={({ selected }) =>
                `${
                  selected
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } flex-1 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm text-center`
              }
            >
              Tips Keuangan
            </Tab>
            <Tab
              className={({ selected }) =>
                `${
                  selected
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } flex-1 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm text-center`
              }
            >
              Quiz
            </Tab>
          </Tab.List>
          <Tab.Panels>
            {/* Lessons Panel */}
            <Tab.Panel className="p-6">
              <div className="space-y-6">
                {content.lessons.map((lesson) => (
                  <div key={lesson._id} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">{lesson.title}</h3>
                        <p className="mt-1 text-sm text-gray-500">Level: {lesson.level}</p>
                      </div>
                      <div className="flex space-x-3">
                        <button
                          onClick={() => handleEdit(lesson, 'lesson')}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(lesson._id, 'lesson')}
                          className="text-red-600 hover:text-red-900"
                        >
                          Hapus
                        </button>
                      </div>
                    </div>
                    <div className="mt-4 prose max-w-none">
                      <p className="text-gray-700">{lesson.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Tab.Panel>

            {/* Tips Panel */}
            <Tab.Panel className="p-6">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {content.tips.map((tip) => (
                  <div key={tip._id} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium text-gray-900">{tip.title}</h3>
                      <div className="flex space-x-3">
                        <button
                          onClick={() => handleEdit(tip, 'tip')}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(tip._id, 'tip')}
                          className="text-red-600 hover:text-red-900"
                        >
                          Hapus
                        </button>
                      </div>
                    </div>
                    <p className="mt-2 text-sm text-gray-500">{tip.content}</p>
                  </div>
                ))}
              </div>
            </Tab.Panel>

            {/* Quizzes Panel */}
            <Tab.Panel className="p-6">
              <div className="space-y-6">
                {content.quizzes.map((quiz) => (
                  <div key={quiz._id} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">{quiz.title}</h3>
                        <p className="mt-1 text-sm text-gray-500">Level: {quiz.level}</p>
                      </div>
                      <div className="flex space-x-3">
                        <button
                          onClick={() => handleEdit(quiz, 'quiz')}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(quiz._id, 'quiz')}
                          className="text-red-600 hover:text-red-900"
                        >
                          Hapus
                        </button>
                      </div>
                    </div>
                    <div className="mt-4 space-y-4">
                      {quiz.questions.map((question, index) => (
                        <div key={index} className="bg-white rounded-md p-4">
                          <p className="font-medium text-gray-900">{question.text}</p>
                          <ul className="mt-2 space-y-2">
                            {question.options.map((option, optIndex) => (
                              <li
                                key={optIndex}
                                className={`text-sm ${
                                  optIndex === question.correctAnswer
                                    ? 'text-green-600 font-medium'
                                    : 'text-gray-500'
                                }`}
                              >
                                {option}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Tab.Panel>
          </Tab.Panels>
        </Tab.Group>
      </div>

      {/* Add/Edit Content Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <form onSubmit={handleSubmit}>
                <div>
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    {formData._id ? 'Edit Konten' : 'Tambah Konten'}
                  </h3>
                  <div className="mt-4 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Tipe Konten</label>
                      <select
                        value={formData.type}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      >
                        <option value="lesson">Materi Pembelajaran</option>
                        <option value="tip">Tips Keuangan</option>
                        <option value="quiz">Quiz</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Judul</label>
                      <input
                        type="text"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        required
                      />
                    </div>
                    {formData.type !== 'quiz' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Konten</label>
                        <textarea
                          value={formData.content}
                          onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                          rows={6}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                          required
                        />
                      </div>
                    )}
                    {formData.type !== 'tip' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Level</label>
                        <select
                          value={formData.level}
                          onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        >
                          <option value="basic">Dasar</option>
                          <option value="intermediate">Menengah</option>
                          <option value="advanced">Lanjutan</option>
                        </select>
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Kategori</label>
                      <input
                        type="text"
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      />
                    </div>
                  </div>
                </div>
                <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                  <button
                    type="submit"
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:col-start-2 sm:text-sm"
                  >
                    {formData._id ? 'Simpan' : 'Tambah'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:col-start-1 sm:text-sm"
                  >
                    Batal
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EducationManagement;
