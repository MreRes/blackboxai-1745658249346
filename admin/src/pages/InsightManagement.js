import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import moment from 'moment';

const InsightManagement = () => {
  const [insights, setInsights] = useState({
    userStats: [],
    transactionStats: [],
    budgetStats: [],
    goalStats: [],
    financialHealth: []
  });
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState('all');
  const [timeframe, setTimeframe] = useState('month');
  const [users, setUsers] = useState([]);
  const [analyticsSettings, setAnalyticsSettings] = useState({
    enablePredictiveAnalytics: true,
    enableRiskAnalysis: true,
    enableBehavioralAnalysis: true,
    dataRetentionPeriod: 12,
    analysisFrequency: 'daily'
  });

  useEffect(() => {
    fetchUsers();
    fetchInsights();
  }, [selectedUser, timeframe]);

  const fetchUsers = async () => {
    try {
      const response = await axios.get('/api/admin/users');
      setUsers(response.data);
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };

  const fetchInsights = async () => {
    try {
      const response = await axios.get(`/api/admin/insights?userId=${selectedUser}&timeframe=${timeframe}`);
      setInsights(response.data);
      setLoading(false);
    } catch (err) {
      toast.error('Gagal memuat data insights');
      setLoading(false);
    }
  };

  const handleSettingsUpdate = async () => {
    try {
      await axios.put('/api/admin/insights/settings', analyticsSettings);
      toast.success('Pengaturan analisis berhasil diperbarui');
    } catch (err) {
      toast.error('Gagal memperbarui pengaturan');
    }
  };

  const generateReport = async () => {
    try {
      const response = await axios.post('/api/admin/insights/report', {
        userId: selectedUser,
        timeframe
      }, { responseType: 'blob' });

      // Create blob link to download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `financial-insights-${moment().format('YYYY-MM-DD')}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Laporan berhasil dibuat');
    } catch (err) {
      toast.error('Gagal membuat laporan');
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
        <h1 className="text-2xl font-semibold text-gray-900">Manajemen Insights</h1>
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
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
            className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          >
            <option value="week">Minggu Ini</option>
            <option value="month">Bulan Ini</option>
            <option value="quarter">3 Bulan</option>
            <option value="year">1 Tahun</option>
          </select>
          <button
            onClick={generateReport}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
          >
            Generate Report
          </button>
        </div>
      </div>

      {/* Financial Health Overview */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Kesehatan Keuangan</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {insights.financialHealth.map((metric, index) => (
            <div key={index} className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-500">{metric.name}</h3>
              <p className="mt-2 text-3xl font-bold text-gray-900">{metric.value}</p>
              <div className={`mt-2 flex items-center text-sm ${
                metric.trend > 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                <span>{metric.trend}%</span>
                <svg
                  className={`ml-1 h-5 w-5 ${metric.trend > 0 ? 'text-green-500' : 'text-red-500'}`}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d={
                      metric.trend > 0
                        ? "M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z"
                        : "M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z"
                    }
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Transaction Trends */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Tren Transaksi</h2>
        <div className="h-96">
          <Line
            data={{
              labels: insights.transactionStats.map(stat => moment(stat.date).format('DD MMM')),
              datasets: [
                {
                  label: 'Pemasukan',
                  data: insights.transactionStats.map(stat => stat.income),
                  borderColor: 'rgb(34, 197, 94)',
                  backgroundColor: 'rgba(34, 197, 94, 0.1)',
                  fill: true
                },
                {
                  label: 'Pengeluaran',
                  data: insights.transactionStats.map(stat => stat.expense),
                  borderColor: 'rgb(239, 68, 68)',
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  fill: true
                }
              ]
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              scales: {
                y: {
                  beginAtZero: true,
                  ticks: {
                    callback: value => `Rp ${value.toLocaleString('id-ID')}`
                  }
                }
              }
            }}
          />
        </div>
      </div>

      {/* Budget vs Actual */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Budget vs Aktual</h2>
        <div className="h-96">
          <Bar
            data={{
              labels: insights.budgetStats.map(stat => stat.category),
              datasets: [
                {
                  label: 'Budget',
                  data: insights.budgetStats.map(stat => stat.budget),
                  backgroundColor: 'rgba(59, 130, 246, 0.5)'
                },
                {
                  label: 'Aktual',
                  data: insights.budgetStats.map(stat => stat.actual),
                  backgroundColor: 'rgba(239, 68, 68, 0.5)'
                }
              ]
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              scales: {
                y: {
                  beginAtZero: true,
                  ticks: {
                    callback: value => `Rp ${value.toLocaleString('id-ID')}`
                  }
                }
              }
            }}
          />
        </div>
      </div>

      {/* Goal Progress */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Progress Goal</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-64">
            <Doughnut
              data={{
                labels: insights.goalStats.map(stat => stat.type),
                datasets: [{
                  data: insights.goalStats.map(stat => stat.count),
                  backgroundColor: [
                    'rgba(34, 197, 94, 0.6)',
                    'rgba(59, 130, 246, 0.6)',
                    'rgba(239, 68, 68, 0.6)',
                    'rgba(234, 179, 8, 0.6)'
                  ]
                }]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false
              }}
            />
          </div>
          <div className="space-y-4">
            {insights.goalStats.map((stat, index) => (
              <div key={index} className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-sm font-medium text-gray-900">{stat.type}</h3>
                  <span className="text-sm text-gray-500">{stat.count} goals</span>
                </div>
                <div className="relative pt-1">
                  <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-gray-200">
                    <div
                      style={{ width: `${stat.completionRate}%` }}
                      className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-indigo-500"
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>{stat.completionRate}% completed</span>
                    <span>{stat.onTrack}% on track</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Analytics Settings */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Pengaturan Analisis</h2>
        <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
          <div className="sm:col-span-3">
            <label className="block text-sm font-medium text-gray-700">
              Analisis Prediktif
            </label>
            <select
              value={analyticsSettings.enablePredictiveAnalytics.toString()}
              onChange={(e) => setAnalyticsSettings({
                ...analyticsSettings,
                enablePredictiveAnalytics: e.target.value === 'true'
              })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              <option value="true">Aktif</option>
              <option value="false">Nonaktif</option>
            </select>
          </div>

          <div className="sm:col-span-3">
            <label className="block text-sm font-medium text-gray-700">
              Analisis Risiko
            </label>
            <select
              value={analyticsSettings.enableRiskAnalysis.toString()}
              onChange={(e) => setAnalyticsSettings({
                ...analyticsSettings,
                enableRiskAnalysis: e.target.value === 'true'
              })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              <option value="true">Aktif</option>
              <option value="false">Nonaktif</option>
            </select>
          </div>

          <div className="sm:col-span-3">
            <label className="block text-sm font-medium text-gray-700">
              Analisis Perilaku
            </label>
            <select
              value={analyticsSettings.enableBehavioralAnalysis.toString()}
              onChange={(e) => setAnalyticsSettings({
                ...analyticsSettings,
                enableBehavioralAnalysis: e.target.value === 'true'
              })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              <option value="true">Aktif</option>
              <option value="false">Nonaktif</option>
            </select>
          </div>

          <div className="sm:col-span-3">
            <label className="block text-sm font-medium text-gray-700">
              Periode Retensi Data (bulan)
            </label>
            <input
              type="number"
              value={analyticsSettings.dataRetentionPeriod}
              onChange={(e) => setAnalyticsSettings({
                ...analyticsSettings,
                dataRetentionPeriod: parseInt(e.target.value)
              })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>

          <div className="sm:col-span-3">
            <label className="block text-sm font-medium text-gray-700">
              Frekuensi Analisis
            </label>
            <select
              value={analyticsSettings.analysisFrequency}
              onChange={(e) => setAnalyticsSettings({
                ...analyticsSettings,
                analysisFrequency: e.target.value
              })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              <option value="hourly">Per Jam</option>
              <option value="daily">Harian</option>
              <option value="weekly">Mingguan</option>
            </select>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSettingsUpdate}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
          >
            Simpan Pengaturan
          </button>
        </div>
      </div>
    </div>
  );
};

export default InsightManagement;
