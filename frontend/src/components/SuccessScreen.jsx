import React from 'react';
import { CheckCircle } from 'lucide-react';

const SuccessScreen = ({ data, onDone }) => {
  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(val);
  };

  const formatDate = (dateString) => {
    const options = { day: '2-digit', month: 'short', year: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-IN', options);
  };

  const formatTime = (dateString) => {
    const options = { hour: '2-digit', minute: '2-digit', hour12: true };
    return new Date(dateString).toLocaleTimeString('en-IN', options);
  };

  const { transaction, receiverName } = data;

  return (
    <div className="container" style={{ padding: '4rem 1rem', display: 'flex', justifyContent: 'center' }}>
      <div className="card text-center" style={{ width: '100%', maxWidth: '450px', padding: '3rem 2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
          <CheckCircle size={64} color="var(--success-color)" />
        </div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '1.5rem', color: 'var(--success-color)' }}>
          Money Sent Successfully
        </h2>
        
        <div style={{ marginBottom: '2rem' }}>
          <p className="text-muted" style={{ marginBottom: '0.25rem' }}>Amount</p>
          <div style={{ fontSize: '2.5rem', fontWeight: '700', color: 'var(--text-main)' }}>
            {formatCurrency(transaction.amount)}
          </div>
        </div>

        <div style={{ backgroundColor: '#f8fafc', borderRadius: 'var(--radius-md)', padding: '1.5rem', textAlign: 'left', marginBottom: '2rem', border: '1px solid var(--border-color)' }}>
          <div className="flex justify-between mb-4">
            <span className="text-muted">To</span>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontWeight: '600' }}>{receiverName || 'User'}</p>
              <p className="text-muted" style={{ fontSize: '0.875rem' }}>{transaction.receiver_upi_id}</p>
            </div>
          </div>
          <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '1rem 0' }} />
          <div className="flex justify-between mb-3" style={{ fontSize: '0.875rem' }}>
            <span className="text-muted">Transaction ID</span>
            <span style={{ fontWeight: '500' }}>{transaction.transaction_id}</span>
          </div>
          <div className="flex justify-between mb-3" style={{ fontSize: '0.875rem' }}>
            <span className="text-muted">Date & Time</span>
            <span style={{ fontWeight: '500' }}>
              {formatDate(transaction.created_at)}, {formatTime(transaction.created_at)}
            </span>
          </div>
          <div className="flex justify-between" style={{ fontSize: '0.875rem' }}>
            <span className="text-muted">Status</span>
            <span style={{ fontWeight: '600', color: 'var(--success-color)' }}>{transaction.status}</span>
          </div>
        </div>

        <button className="btn btn-primary w-full" onClick={onDone}>
          Done
        </button>
      </div>
    </div>
  );
};

export default SuccessScreen;
