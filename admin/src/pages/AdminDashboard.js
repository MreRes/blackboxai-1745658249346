import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Line, Bar } from 'react-chartjs-2';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

const AdminDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dashboardData, setDashboardData] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalTransactions: 0,
    totalAmount: 0,
    recentTransactions: [],
    userStats: [],
    transactionTrends: [],
    activeSubscriptions: []
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await axios.get('/api/admin/dashboard');
      setDashboardData(response.data);
      setLoading(false);
    } catch (err) {
      setError('Gagal memuat data dashboard');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 p-4 rounded-md">
        <p className="text-red-700">{error}</p>
      </div>
    );
  }

  // Prepare chart data
  const transactionTrendsData = {
    labels: dashboardData.transactionTrends.map(item => format(new Date(item.date), 'dd MMM', { locale: id })),
    datasets: [
      {
        label: 'Total Transaksi',
        data: dashboardData.transactionTrends.map(item => item.count),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true
      }
    ]
  };

  const userStatsData = {
    labels: dashboardData.userStats.map(item => item.category),
    datasets: [
      {
        label: 'Jumlah User',
        data: dashboardData.userStats.map(item => item.count),
        backgroundColor: 'rgba(59, 130, 246, 0.6)',
      }
    ]
  };

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Total User</h3>
          <p className="mt-2 text-3xl font-bold text-gray-900">
            {dashboardData.totalUsers}
          </p>
          <p className="mt-1 text-sm text-gray-500">
            {dashboardData.activeUsers} user aktif
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Total Transaksi</h3>
          <p className="mt-2 text-3xl font-bold text-gray-900">
            {dashboardData.totalTransactions}
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Rp {dashboardData.totalAmount.toLocaleString('id-ID')}
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Subscription Aktif</h3>
          <p className="mt-2 text-3xl font-bold text-indigo-600">
            {dashboardData.activeSubscriptions.length}
          </p>
          <p className="mt-1 text-sm text-gray-500">
            {dashboardData.activeSubscriptions.filter(s => s.expiresIn <= 7).length} akan berakhir dalam 7 hari
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Status WhatsApp</h3>
          <p className="mt-2 text-3xl font-bold text-green-600">
            {dashboardData.whatsappStatus === 'connected' ? 'Online' : 'Offline'}
          </p>
          <p className="mt-1 text-sm text-gray-500">
            {dashboardData.whatsappStatus === 'connected' ? 'Bot berjalan normal' : 'Perlu koneksi ulang'}
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Tren Transaksi</h3>
          <div className="h-64">
            <Line
              data={transactionTrendsData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: {
                      precision: 0
                    }
                  }
                }
              }}
            />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Statistik User</h3>
          <div className="h-64">
            <Bar
              data={userStatsData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: {
                      precision: 0
                    }
                  }
                }
              }}
            />
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg font-medium text-gray-900">Transaksi Terbaru</h3>
        </div>
        <div className="border-t border-gray-200">
          <ul role="list" className="divide-y divide-gray-200">
            {dashboardData.recentTransactions.map((transaction) => (
              <li key={transaction._id}>
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {transaction.user.username}
                      </p>
                      <p className="text-sm text-gray-500">
                        {transaction.description}
                      </p>
                      <p className="text-sm text-gray-500">
                        {format(new Date(transaction.date), 'dd MMMM yyyy HH:mm', { locale: id })}
                      </p>
                    </div>
                    <div className={`text-sm font-semibold ${
                      transaction.type === 'expense' ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {transaction.type === 'expense' ? '-' : '+'}
                      Rp {transaction.amount.toLocaleString('id-ID')}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Active Subscriptions */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg font-medium text-gray-900">Subscription yang Akan Berakhir</h3>
        </div>
        <div className="border-t border-gray-200">
          <ul role="list" className="divide-y divide-gray-200">
            {dashboardData.activeSubscriptions
              .filter(subscription => subscription.expiresIn <= 7)
              .map((subscription) => (
                <li key={subscription.userId}>
                  <div className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          {subscription.username}
                        </p>
                        <p className="text-sm text-gray-500">
                          {subscription.phoneNumber}
                        </p>
                      </div>
                      <div className="text-sm text-yellow-600 font-medium">
                        Berakhir dalam {subscription.expiresIn} hari
                      </div>
                    </div>
                  </div>
                </li>
              ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
