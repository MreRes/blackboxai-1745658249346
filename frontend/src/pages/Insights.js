import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
import moment from 'moment';

const Insights = () => {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeframe, setTimeframe] = useState('month'); // month, quarter, year
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    fetchInsights();
  }, [timeframe, selectedCategory]);

  const fetchInsights = async () => {
    try {
      const response = await axios.get(`/api/insights?timeframe=${timeframe}&category=${selectedCategory}`);
      setInsights(response.data);
      setLoading(false);
    } catch (err) {
      setError('Gagal memuat data insights');
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

  if (!insights) return null;

  return (
    <div className="space-y-6">
      {/* Header with Filters */}
      <div className="sm:flex sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Analisis Keuangan</h1>
        <div className="mt-3 sm:mt-0 flex space-x-3">
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
            className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          >
            <option value="month">1 Bulan</option>
            <option value="quarter">3 Bulan</option>
            <option value="year">1 Tahun</option>
          </select>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          >
            <option value="all">Semua Kategori</option>
            {insights.categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Financial Health Score */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Skor Kesehatan Keuangan</h2>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="relative pt-1">
              <div className="flex mb-2 items-center justify-between">
                <div>
                  <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-indigo-600 bg-indigo-200">
                    Skor: {insights.healthScore}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-semibold inline-block text-indigo-600">
                    {insights.healthStatus}
                  </span>
                </div>
              </div>
              <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-indigo-200">
                <div
                  style={{ width: `${insights.healthScore}%` }}
                  className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-indigo-500"
                ></div>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          {insights.healthFactors.map((factor, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg ${
                factor.type === 'positive' 
                  ? 'bg-green-50 text-green-700'
                  : factor.type === 'warning'
                  ? 'bg-yellow-50 text-yellow-700'
                  : 'bg-red-50 text-red-700'
              }`}
            >
              <p className="text-sm">{factor.message}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Spending Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Spending Trends */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Tren Pengeluaran</h2>
          <div className="h-64">
            <Line
              data={{
                labels: insights.spendingTrends.map(t => moment(t.date).format('DD MMM')),
                datasets: [{
                  label: 'Pengeluaran',
                  data: insights.spendingTrends.map(t => t.amount),
                  borderColor: 'rgb(239, 68, 68)',
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  fill: true
                }]
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

        {/* Category Distribution */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Distribusi Kategori</h2>
          <div className="h-64">
            <Doughnut
              data={{
                labels: insights.categoryDistribution.map(c => c.category),
                datasets: [{
                  data: insights.categoryDistribution.map(c => c.percentage),
                  backgroundColor: [
                    'rgba(59, 130, 246, 0.6)',
                    'rgba(16, 185, 129, 0.6)',
                    'rgba(239, 68, 68, 0.6)',
                    'rgba(245, 158, 11, 0.6)',
                    'rgba(139, 92, 246, 0.6)',
                  ]
                }]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false
              }}
            />
          </div>
        </div>
      </div>

      {/* Recommendations */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Rekomendasi</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {insights.recommendations.map((rec, index) => (
            <div key={index} className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-start">
                <div className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full ${
                  rec.priority === 'high' 
                    ? 'bg-red-100 text-red-600'
                    : rec.priority === 'medium'
                    ? 'bg-yellow-100 text-yellow-600'
                    : 'bg-green-100 text-green-600'
                }`}>
                  <i className={`fas fa-${rec.icon}`}></i>
                </div>
                <div className="ml-4">
                  <h3 className="text-sm font-medium text-gray-900">{rec.title}</h3>
                  <p className="mt-1 text-sm text-gray-500">{rec.description}</p>
                  {rec.action && (
                    <button
                      onClick={() => {/* Handle action */}}
                      className="mt-2 text-sm font-medium text-indigo-600 hover:text-indigo-500"
                    >
                      {rec.action}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Financial Tips */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Tips Keuangan</h2>
        <div className="space-y-4">
          {insights.tips.map((tip, index) => (
            <div key={index} className="flex items-start">
              <div className="flex-shrink-0">
                <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-indigo-100 text-indigo-600">
                  <i className={`fas fa-${tip.icon}`}></i>
                </span>
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-900">{tip.title}</h3>
                <p className="mt-1 text-sm text-gray-500">{tip.content}</p>
                {tip.link && (
                  <a
                    href={tip.link}
                    className="mt-2 text-sm font-medium text-indigo-600 hover:text-indigo-500"
                  >
                    Pelajari lebih lanjut
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Insights;
