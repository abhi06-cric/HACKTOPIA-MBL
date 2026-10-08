import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { ArrowRightLeft, LogOut, Send } from 'lucide-react';
import SendMoneyModal from './SendMoneyModal';
import SuccessScreen from './SuccessScreen';

const Dashboard = ({ user, setUser, onLogout, token }) => {
  const [transactions, setTransactions] = useState([]);
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  const [successData, setSuccessData] = useState(null);
  const [socket, setSocket] = useState(null);

  const API_URL = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5005`;

  const fetchTransactions = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/transactions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTransactions(res.data);
    } catch (err) {
      console.error('Failed to fetch transactions', err);
    }
  };

  useEffect(() => {
    fetchTransactions();

    const newSocket = io(API_URL);
    setSocket(newSocket);

    newSocket.on('connect', () => {
      newSocket.emit('join', user.id);
    });

    newSocket.on('balance_update', (data) => {
      setUser((prevUser) => ({ ...prevUser, balance: data.newBalance }));
    });

    newSocket.on('new_transaction', (txn) => {
      setTransactions((prev) => [txn, ...prev]);
    });

    return () => newSocket.close();
  }, [token, user.id, setUser]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  const formatDate = (dateString) => {
    const options = { day: '2-digit', month: 'short', year: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-IN', options);
  };

  const formatTime = (dateString) => {
    const options = { hour: '2-digit', minute: '2-digit', hour12: true };
    return new Date(dateString).toLocaleTimeString('en-IN', options);
  };

  if (successData) {
    return <SuccessScreen data={successData} onDone={() => setSuccessData(null)} />;
  }

  return (
    <div className="container" style={{ paddingBottom: '3rem' }}>
      <header className="flex justify-between items-center mt-6 mb-8">
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '700' }}>Welcome, {user.name}</h1>
          <p className="text-muted" style={{ fontSize: '0.875rem' }}>UPI ID: <strong>{user.upi_id}</strong></p>
        </div>
        <button onClick={onLogout} className="btn btn-outline flex items-center gap-2">
          <LogOut size={16} /> Logout
        </button>
      </header>

      <div className="balance-card">
        <h2 className="balance-title">Available Balance</h2>
        <div className="balance-amount">
          {formatCurrency(user.balance)}
        </div>
        <button 
          onClick={() => setIsSendModalOpen(true)}
          className="send-btn" 
        >
          <Send size={18} /> Send Money
        </button>
      </div>

      <div className="card">
        <div className="flex justify-between items-center mb-6">
          <h3 style={{ fontSize: '1.25rem', fontWeight: '600' }}>Recent Transactions</h3>
          <ArrowRightLeft size={20} className="text-muted" />
        </div>

        {transactions.length === 0 ? (
          <p className="text-muted text-center" style={{ padding: '2rem 0' }}>No transactions found.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {transactions.map((txn) => {
              const isSender = txn.sender_upi_id === user.upi_id;
              return (
                <div key={txn.transaction_id} className="transaction-item">
                  <div>
                    <p style={{ fontWeight: '600', marginBottom: '0.25rem' }}>
                      {isSender ? `To: ${txn.receiver_upi_id}` : `From: ${txn.sender_upi_id}`}
                    </p>
                    <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      <span>{formatDate(txn.created_at)}</span>
                      <span>{formatTime(txn.created_at)}</span>
                      <span>TXN: {txn.transaction_id}</span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontWeight: '700', fontSize: '1.125rem', color: isSender ? 'var(--error-color)' : 'var(--success-color)' }}>
                      {isSender ? '-' : '+'}{formatCurrency(txn.amount)}
                    </p>
                    <span style={{ fontSize: '0.75rem', backgroundColor: '#dcfce7', color: '#166534', padding: '0.125rem 0.5rem', borderRadius: '9999px', fontWeight: '500' }}>
                      {txn.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {isSendModalOpen && (
        <SendMoneyModal 
          token={token}
          user={user}
          onClose={() => setIsSendModalOpen(false)} 
          onSuccess={(data) => {
            setIsSendModalOpen(false);
            setSuccessData(data);
          }} 
        />
      )}
    </div>
  );
};

export default Dashboard;
