import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { format, addDays, addMonths, addYears } from 'date-fns';
import { id } from 'date-fns/locale';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [showActivationForm, setShowActivationForm] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    username: '',
    maxPhoneNumbers: 1,
    activationCode: '',
    expiryDuration: '7', // days
    expiryType: 'days'
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await axios.get('/api/admin/users');
      setUsers(response.data);
      setLoading(false);
    } catch (err) {
      setError('Gagal memuat data user');
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingUser) {
        await axios.put(`/api/admin/users/${editingUser._id}`, formData);
      } else {
        await axios.post('/api/admin/users', formData);
      }
      
      fetchUsers();
      setShowForm(false);
      setEditingUser(null);
      resetForm();
    } catch (err) {
      setError('Gagal menyimpan user');
    }
  };

  const handleActivationSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('/api/admin/users/generate-activation', {
        duration: parseInt(formData.expiryDuration),
        durationType: formData.expiryType
      });
      
      // Show activation code in alert
      alert(`Kode Aktivasi: ${response.data.activationCode}\nBerlaku hingga: ${format(new Date(response.data.expiresAt), 'dd MMMM yyyy HH:mm', { locale: id })}`);
      
      setShowActivationForm(false);
      resetForm();
      fetchUsers();
    } catch (err) {
      setError('Gagal membuat kode aktivasi');
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      maxPhoneNumbers: user.maxPhoneNumbers,
      expiryDuration: '7',
      expiryType: 'days'
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus user ini?')) {
      try {
        await axios.delete(`/api/admin/users/${id}`);
        fetchUsers();
      } catch (err) {
        setError('Gagal menghapus user');
      }
    }
  };

  const handleExtendSubscription = async (userId) => {
    try {
      await axios.post(`/api/admin/users/${userId}/extend`, {
        duration: parseInt(formData.expiryDuration),
        durationType: formData.expiryType
      });
      fetchUsers();
    } catch (err) {
      setError('Gagal memperpanjang subscription');
    }
  };

  const resetForm = () => {
    setFormData({
      username: '',
      maxPhoneNumbers: 1,
      activationCode: '',
      expiryDuration: '7',
      expiryType: 'days'
    });
  };

  const calculateExpiryDate = () => {
    const duration = parseInt(formData.expiryDuration);
    const today = new Date();
    
    switch (formData.expiryType) {
      case 'days':
        return addDays(today, duration);
      case 'months':
        return addMonths(today, duration);
      case 'years':
        return addYears(today, duration);
      default:
        return today;
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
        <h1 className="text-2xl font-semibold text-gray-900">Manajemen User</h1>
        <div className="mt-3 sm:mt-0 sm:ml-4 space-x-3">
          <button
            onClick={() => {
              setShowActivationForm(true);
              setShowForm(false);
            }}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            Buat Kode Aktivasi
          </button>
          <button
            onClick={() => {
              setShowForm(true);
              setShowActivationForm(false);
              setEditingUser(null);
              resetForm();
            }}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Tambah User
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* User Form Modal */}
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
                    {editingUser ? 'Edit User' : 'Tambah User'}
                  </h3>
                  <div className="mt-4 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Username</label>
                      <input
                        type="text"
                        value={formData.username}
                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Maksimal Nomor</label>
                      <input
                        type="number"
                        min="1"
                        value={formData.maxPhoneNumbers}
                        onChange={(e) => setFormData({ ...formData, maxPhoneNumbers: parseInt(e.target.value) })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        required
                      />
                    </div>
                  </div>
                </div>
                <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                  <button
                    type="submit"
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:col-start-2 sm:text-sm"
                  >
                    {editingUser ? 'Simpan Perubahan' : 'Tambah'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setEditingUser(null);
                      resetForm();
                    }}
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

      {/* Activation Code Form Modal */}
      {showActivationForm && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <form onSubmit={handleActivationSubmit}>
                <div>
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    Buat Kode Aktivasi
                  </h3>
                  <div className="mt-4 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Durasi</label>
                        <input
                          type="number"
                          min="1"
                          value={formData.expiryDuration}
                          onChange={(e) => setFormData({ ...formData, expiryDuration: e.target.value })}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Tipe</label>
                        <select
                          value={formData.expiryType}
                          onChange={(e) => setFormData({ ...formData, expiryType: e.target.value })}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        >
                          <option value="days">Hari</option>
                          <option value="months">Bulan</option>
                          <option value="years">Tahun</option>
                        </select>
                      </div>
                    </div>
                    <p className="text-sm text-gray-500">
                      Berlaku hingga: {format(calculateExpiryDate(), 'dd MMMM yyyy', { locale: id })}
                    </p>
                  </div>
                </div>
                <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                  <button
                    type="submit"
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:col-start-2 sm:text-sm"
                  >
                    Buat Kode
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowActivationForm(false);
                      resetForm();
                    }}
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

      {/* Users List */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul role="list" className="divide-y divide-gray-200">
          {users.map((user) => (
            <li key={user._id}>
              <div className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-indigo-600 truncate">
                        {user.username}
                      </p>
                      <div className="ml-2 flex-shrink-0 flex">
                        <p className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          user.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {user.isActive ? 'Aktif' : 'Nonaktif'}
                        </p>
                      </div>
                    </div>
                    <div className="mt-2">
                      <div className="flex items-center text-sm text-gray-500">
                        <span className="truncate">
                          {user.phoneNumbers.length} nomor terdaftar dari {user.maxPhoneNumbers} maksimal
                        </span>
                      </div>
                      {user.phoneNumbers.map((phone, index) => (
                        <div key={index} className="mt-1 flex items-center text-sm text-gray-500">
                          <span className="truncate">{phone.number}</span>
                          <span className="ml-2">
                            (Berakhir: {format(new Date(phone.expiresAt), 'dd MMM yyyy', { locale: id })})
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="ml-4 flex-shrink-0 flex space-x-2">
                    <button
                      onClick={() => handleEdit(user)}
                      className="text-indigo-600 hover:text-indigo-900"
                    >
                      <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(user._id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default UserManagement;
