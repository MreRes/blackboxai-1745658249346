import React, { useState, useEffect } from 'react';
import axios from 'axios';
import QRCode from 'qrcode.react';

const AdminSettings = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [whatsappStatus, setWhatsappStatus] = useState('disconnected');
  const [qrCode, setQrCode] = useState(null);
  const [showQR, setShowQR] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [backupInProgress, setBackupInProgress] = useState(false);

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    checkWhatsAppStatus();
    // Set up WebSocket connection for real-time status updates
    const ws = new WebSocket('ws://localhost:8000/ws/whatsapp-status');
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'status') {
        setWhatsappStatus(data.status);
      } else if (data.type === 'qr') {
        setQrCode(data.qr);
        setShowQR(true);
      }
    };

    return () => {
      ws.close();
    };
  }, []);

  const checkWhatsAppStatus = async () => {
    try {
      const response = await axios.get('/api/admin/whatsapp/status');
      setWhatsappStatus(response.data.status);
    } catch (error) {
      setError('Gagal memeriksa status WhatsApp');
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('Password baru tidak cocok');
      setLoading(false);
      return;
    }

    try {
      await axios.post('/api/admin/settings/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });

      setSuccess('Password berhasil diubah');
      setShowPasswordForm(false);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal mengubah password');
    } finally {
      setLoading(false);
    }
  };

  const handleBackupDatabase = async () => {
    try {
      setBackupInProgress(true);
      const response = await axios.get('/api/admin/settings/backup', {
        responseType: 'blob'
      });

      // Create blob link to download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const date = new Date().toISOString().split('T')[0];
      link.setAttribute('download', `backup-${date}.zip`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      setSuccess('Backup database berhasil');
    } catch (err) {
      setError('Gagal melakukan backup database');
    } finally {
      setBackupInProgress(false);
    }
  };

  const handleRestoreDatabase = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('backup', file);

    try {
      setLoading(true);
      await axios.post('/api/admin/settings/restore', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      setSuccess('Database berhasil direstore');
    } catch (err) {
      setError('Gagal melakukan restore database');
    } finally {
      setLoading(false);
      e.target.value = null; // Reset file input
    }
  };

  const handleLogoutWhatsApp = async () => {
    try {
      await axios.post('/api/admin/whatsapp/logout');
      setWhatsappStatus('disconnected');
      setSuccess('Berhasil logout dari WhatsApp');
    } catch (err) {
      setError('Gagal logout dari WhatsApp');
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-gray-900">Pengaturan</h1>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border-l-4 border-green-500 p-4">
          <p className="text-green-700">{success}</p>
        </div>
      )}

      {/* WhatsApp Connection */}
      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Koneksi WhatsApp
          </h3>
          <div className="mt-2 max-w-xl text-sm text-gray-500">
            <p>Status: {whatsappStatus === 'connected' ? 'Terhubung' : 'Terputus'}</p>
          </div>
          <div className="mt-5">
            {whatsappStatus === 'connected' ? (
              <button
                onClick={handleLogoutWhatsApp}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Logout WhatsApp
              </button>
            ) : (
              <button
                onClick={() => setShowQR(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Hubungkan WhatsApp
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Password Change */}
      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Ubah Password Admin
          </h3>
          <div className="mt-2 max-w-xl text-sm text-gray-500">
            <p>Pastikan menggunakan password yang kuat dan aman.</p>
          </div>
          <div className="mt-5">
            {!showPasswordForm ? (
              <button
                onClick={() => setShowPasswordForm(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Ubah Password
              </button>
            ) : (
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div>
                  <label htmlFor="current-password" className="block text-sm font-medium text-gray-700">
                    Password Saat Ini
                  </label>
                  <input
                    type="password"
                    id="current-password"
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="new-password" className="block text-sm font-medium text-gray-700">
                    Password Baru
                  </label>
                  <input
                    type="password"
                    id="new-password"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700">
                    Konfirmasi Password Baru
                  </label>
                  <input
                    type="password"
                    id="confirm-password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    required
                  />
                </div>
                <div className="flex space-x-3">
                  <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    {loading ? 'Menyimpan...' : 'Simpan Password'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowPasswordForm(false);
                      setPasswordData({
                        currentPassword: '',
                        newPassword: '',
                        confirmPassword: ''
                      });
                    }}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Batal
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Database Backup/Restore */}
      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Backup & Restore Database
          </h3>
          <div className="mt-2 max-w-xl text-sm text-gray-500">
            <p>Backup data secara berkala untuk menghindari kehilangan data.</p>
          </div>
          <div className="mt-5 space-y-4">
            <button
              onClick={handleBackupDatabase}
              disabled={backupInProgress}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              {backupInProgress ? 'Memproses...' : 'Backup Database'}
            </button>
            <div>
              <label
                htmlFor="restore-file"
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 cursor-pointer"
              >
                Restore Database
              </label>
              <input
                id="restore-file"
                type="file"
                accept=".zip"
                onChange={handleRestoreDatabase}
                className="hidden"
              />
            </div>
          </div>
        </div>
      </div>

      {/* QR Code Modal */}
      {showQR && qrCode && (
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
                    <QRCode value={qrCode} size={256} />
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
                  className="inline-flex justify-center w-full rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:text-sm"
                  onClick={() => setShowQR(false)}
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

export default AdminSettings;
