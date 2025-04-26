import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

const GoalManagement = () => {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedUser, setSelectedUser] = useState('all');
  const [users, setUsers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    userId: '',
    type: 'savings',
    name: '',
    targetAmount: '',
    targetDate: '',
    priority: 'medium'
  });

  useEffect(() => {
    fetchUsers();
    fetchGoals();
  }, [selectedUser]);

  const fetchUsers = async () => {
    try {
      const response = await axios.get('/api/admin/users');
      setUsers(response.data);
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };

  const fetchGoals = async () => {
    try {
      const url = selectedUser === 'all' 
        ? '/api/admin/goals'
        : `/api/admin/goals?userId=${selectedUser}`;
      const response = await axios.get(url);
      setGoals(response.data);
      setLoading(false);
    } catch (err) {
      setError('Gagal memuat data goals');
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/admin/goals', formData);
      toast.success('Goal berhasil dibuat');
      setShowForm(false);
      fetchGoals();
    } catch (err) {
      toast.error('Gagal membuat goal');
    }
  };

  const handleDelete = async (goalId) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus goal ini?')) {
      try {
        await axios.delete(`/api/admin/goals/${goalId}`);
        toast.success('Goal berhasil dihapus');
        fetchGoals();
      } catch (err) {
        toast.error('Gagal menghapus goal');
      }
    }
  };

  const handleEdit = async (goal) => {
    try {
      const response = await axios.put(`/api/admin/goals/${goal._id}`, goal);
      toast.success('Goal berhasil diperbarui');
      fetchGoals();
    } catch (err) {
      toast.error('Gagal memperbarui goal');
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
        <h1 className="text-2xl font-semibold text-gray-900">Manajemen Goals</h1>
        <div className="mt-3 sm:mt-0 flex space-x-3">
          <select
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
            className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          >
            <option value="all">Semua User</option>
            {users.map(user => (
              <option key={user._id} value={user._id}>{user.username}</option>
            ))}
          </select>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
          >
            Tambah Goal
          </button>
        </div>
      </div>

      {/* Goals List */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul role="list" className="divide-y divide-gray-200">
          {goals.map((goal) => (
            <li key={goal._id}>
              <div className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-indigo-600 truncate">
                        {goal.name}
                      </p>
                      <div className="ml-2 flex-shrink-0 flex">
                        <p className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          goal.priority === 'high'
                            ? 'bg-red-100 text-red-800'
                            : goal.priority === 'medium'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {goal.priority}
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 flex justify-between">
                      <div className="sm:flex">
                        <p className="flex items-center text-sm text-gray-500">
                          <span className="truncate">User: {users.find(u => u._id === goal.userId)?.username}</span>
                        </p>
                        <p className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 sm:ml-6">
                          <span>Target: Rp {goal.targetAmount.toLocaleString('id-ID')}</span>
                        </p>
                      </div>
                      <div className="ml-2 flex-shrink-0 flex">
                        <button
                          onClick={() => handleEdit(goal)}
                          className="mr-2 text-indigo-600 hover:text-indigo-900"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(goal._id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Hapus
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-2">
                  <div className="relative pt-1">
                    <div className="flex mb-2 items-center justify-between">
                      <div>
                        <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-indigo-600 bg-indigo-200">
                          Progress
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-semibold inline-block text-indigo-600">
                          {((goal.currentAmount / goal.targetAmount) * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-indigo-200">
                      <div
                        style={{ width: `${(goal.currentAmount / goal.targetAmount) * 100}%` }}
                        className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-indigo-500"
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Add Goal Modal */}
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
                    Tambah Goal Baru
                  </h3>
                  <div className="mt-4 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">User</label>
                      <select
                        value={formData.userId}
                        onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        required
                      >
                        <option value="">Pilih User</option>
                        {users.map(user => (
                          <option key={user._id} value={user._id}>{user.username}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Jenis Goal</label>
                      <select
                        value={formData.type}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        required
                      >
                        <option value="savings">Tabungan</option>
                        <option value="emergency_fund">Dana Darurat</option>
                        <option value="investment">Investasi</option>
                        <option value="education">Pendidikan</option>
                        <option value="purchase">Pembelian</option>
                        <option value="debt_payment">Pembayaran Utang</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Nama Goal</label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Target Jumlah</label>
                      <input
                        type="number"
                        value={formData.targetAmount}
                        onChange={(e) => setFormData({ ...formData, targetAmount: e.target.value })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Target Tanggal</label>
                      <input
                        type="date"
                        value={formData.targetDate}
                        onChange={(e) => setFormData({ ...formData, targetDate: e.target.value })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Prioritas</label>
                      <select
                        value={formData.priority}
                        onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      >
                        <option value="low">Rendah</option>
                        <option value="medium">Sedang</option>
                        <option value="high">Tinggi</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                  <button
                    type="submit"
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:col-start-2 sm:text-sm"
                  >
                    Tambah
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

export default GoalManagement;
