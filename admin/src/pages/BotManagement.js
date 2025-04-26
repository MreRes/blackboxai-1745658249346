import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import QRCode from 'qrcode.react';

const BotManagement = () => {
  const [botStatus, setBotStatus] = useState({
    status: 'disconnected',
    qrCode: null,
    lastConnection: null,
    activeUsers: 0,
    pendingMessages: 0,
    dailyMessages: 0
  });
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState({
    autoReconnect: true,
    notificationDelay: 5,
    maxRetries: 3,
    sessionTimeout: 30,
    language: 'id',
    debugMode: false
  });
  const [nlpStats, setNlpStats] = useState({
    totalProcessed: 0,
    successRate: 0,
    averageResponseTime: 0,
    commonIntents: [],
    unknownPatterns: []
  });
  const [showQR, setShowQR] = useState(false);

  useEffect(() => {
    fetchBotStatus();
    fetchNLPStats();
    const interval = setInterval(fetchBotStatus, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchBotStatus = async () => {
    try {
      const response = await axios.get('/api/admin/bot/status');
      setBotStatus(response.data);
      setLoading(false);
    } catch (err) {
      toast.error('Gagal memuat status bot');
      setLoading(false);
    }
  };

  const fetchNLPStats = async () => {
    try {
      const response = await axios.get('/api/admin/bot/nlp-stats');
      setNlpStats(response.data);
    } catch (err) {
      console.error('Gagal memuat statistik NLP:', err);
    }
  };

  const handleSettingsUpdate = async () => {
    try {
      await axios.put('/api/admin/bot/settings', settings);
      toast.success('Pengaturan berhasil diperbarui');
    } catch (err) {
      toast.error('Gagal memperbarui pengaturan');
    }
  };

  const handleReconnect = async () => {
    try {
      const response = await axios.post('/api/admin/bot/reconnect');
      if (response.data.qrCode) {
        setBotStatus(prev => ({ ...prev, qrCode: response.data.qrCode }));
        setShowQR(true);
      }
      toast.info('Menghubungkan kembali ke WhatsApp...');
    } catch (err) {
      toast.error('Gagal menghubungkan kembali');
    }
  };

  const handleLogout = async () => {
    if (window.confirm('Apakah Anda yakin ingin logout dari WhatsApp?')) {
      try {
        await axios.post('/api/admin/bot/logout');
        toast.success('Berhasil logout dari WhatsApp');
        setBotStatus(prev => ({ ...prev, status: 'disconnected', qrCode: null }));
      } catch (err) {
        toast.error('Gagal logout dari WhatsApp');
      }
    }
  };

  const handleClearSession = async () => {
    if (window.confirm('Apakah Anda yakin ingin menghapus sesi? Ini akan memutuskan koneksi WhatsApp.')) {
      try {
        await axios.post('/api/admin/bot/clear-session');
        toast.success('Sesi berhasil dihapus');
        setBotStatus(prev => ({ ...prev, status: 'disconnected', qrCode: null }));
      } catch (err) {
        toast.error('Gagal menghapus sesi');
      }
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
        <h1 className="text-2xl font-semibold text-gray-900">Manajemen Bot WhatsApp</h1>
        <div className="mt-3 sm:mt-0 flex space-x-3">
          {botStatus.status === 'connected' ? (
            <button
              onClick={handleLogout}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700"
            >
              Logout WhatsApp
            </button>
          ) : (
            <button
              onClick={handleReconnect}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
            >
              Hubungkan WhatsApp
            </button>
          )}
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className={`h-3 w-3 rounded-full ${
                  botStatus.status === 'connected' ? 'bg-green-400' : 'bg-red-400'
                }`}></div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Status</dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">
                      {botStatus.status === 'connected' ? 'Terhubung' : 'Terputus'}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">User Aktif</dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">
                      {botStatus.activeUsers}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Pesan Hari Ini</dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">
                      {botStatus.dailyMessages}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Waktu Respons</dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">
                      {nlpStats.averageResponseTime.toFixed(2)}ms
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* NLP Stats */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Statistik NLP</h3>
          <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <div className="bg-gray-50 overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <dt className="text-sm font-medium text-gray-500 truncate">Total Pesan Diproses</dt>
                <dd className="mt-1 text-3xl font-semibold text-gray-900">{nlpStats.totalProcessed}</dd>
              </div>
            </div>
            <div className="bg-gray-50 overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <dt className="text-sm font-medium text-gray-500 truncate">Tingkat Keberhasilan</dt>
                <dd className="mt-1 text-3xl font-semibold text-gray-900">{nlpStats.successRate}%</dd>
              </div>
            </div>
            <div className="bg-gray-50 overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <dt className="text-sm font-medium text-gray-500 truncate">Intent Tidak Dikenali</dt>
                <dd className="mt-1 text-3xl font-semibold text-gray-900">{nlpStats.unknownPatterns.length}</dd>
              </div>
            </div>
          </div>

          {/* Common Intents */}
          <div className="mt-6">
            <h4 className="text-sm font-medium text-gray-500">Intent Umum</h4>
            <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {nlpStats.commonIntents.map((intent, index) => (
                <div key={index} className="relative bg-white pt-5 px-4 pb-12 sm:pt-6 sm:px-6 shadow rounded-lg overflow-hidden">
                  <dt>
                    <p className="text-sm font-medium text-gray-500 truncate">{intent.name}</p>
                  </dt>
                  <dd className="pb-6 flex items-baseline sm:pb-7">
                    <p className="text-2xl font-semibold text-gray-900">{intent.count}</p>
                    <p className="ml-2 flex items-baseline text-sm font-semibold text-green-600">
                      <span className="sr-only">Increased by</span>
                      {intent.percentage}%
                    </p>
                  </dd>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bot Settings */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Pengaturan Bot</h3>
          <div className="mt-6 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
            <div className="sm:col-span-3">
              <label className="block text-sm font-medium text-gray-700">Auto Reconnect</label>
              <div className="mt-1">
                <select
                  value={settings.autoReconnect.toString()}
                  onChange={(e) => setSettings({ ...settings, autoReconnect: e.target.value === 'true' })}
                  className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                >
                  <option value="true">Ya</option>
                  <option value="false">Tidak</option>
                </select>
              </div>
            </div>

            <div className="sm:col-span-3">
              <label className="block text-sm font-medium text-gray-700">Delay Notifikasi (menit)</label>
              <div className="mt-1">
                <input
                  type="number"
                  value={settings.notificationDelay}
                  onChange={(e) => setSettings({ ...settings, notificationDelay: parseInt(e.target.value) })}
                  className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                />
              </div>
            </div>

            <div className="sm:col-span-3">
              <label className="block text-sm font-medium text-gray-700">Max Retry</label>
              <div className="mt-1">
                <input
                  type="number"
                  value={settings.maxRetries}
                  onChange={(e) => setSettings({ ...settings, maxRetries: parseInt(e.target.value) })}
                  className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                />
              </div>
            </div>

            <div className="sm:col-span-3">
              <label className="block text-sm font-medium text-gray-700">Session Timeout (menit)</label>
              <div className="mt-1">
                <input
                  type="number"
                  value={settings.sessionTimeout}
                  onChange={(e) => setSettings({ ...settings, sessionTimeout: parseInt(e.target.value) })}
                  className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                />
              </div>
            </div>

            <div className="sm:col-span-3">
              <label className="block text-sm font-medium text-gray-700">Bahasa</label>
              <div className="mt-1">
                <select
                  value={settings.language}
                  onChange={(e) => setSettings({ ...settings, language: e.target.value })}
                  className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                >
                  <option value="id">Indonesia</option>
                  <option value="en">English</option>
                </select>
              </div>
            </div>

            <div className="sm:col-span-3">
              <label className="block text-sm font-medium text-gray-700">Mode Debug</label>
              <div className="mt-1">
                <select
                  value={settings.debugMode.toString()}
                  onChange={(e) => setSettings({ ...settings, debugMode: e.target.value === 'true' })}
                  className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                >
                  <option value="true">Aktif</option>
                  <option value="false">Nonaktif</option>
                </select>
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end space-x-3">
            <button
              onClick={handleClearSession}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Hapus Sesi
            </button>
            <button
              onClick={handleSettingsUpdate}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
            >
              Simpan Pengaturan
            </button>
          </div>
        </div>
      </div>

      {/* QR Code Modal */}
      {showQR && botStatus.qrCode && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-sm sm:w-full sm:p-6">
              <div>
                <div className="mt-3 text-center sm:mt-5">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    Scan QR Code
                  </h3>
                  <div className="mt-4">
                    <QRCode value={botStatus.qrCode} size={256} />
                  </div>
                  <div className="mt-4">
                    <p className="text-sm text-gray-500">
                      Buka WhatsApp di ponsel Anda dan scan QR code ini
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-5 sm:mt-6">
                <button
                  type="button"
                  onClick={() => setShowQR(false)}
                  className="inline-flex justify-center w-full rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:text-sm"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BotManagement;
