import React, { useState } from 'react';
import axios from 'axios';
import { X } from 'lucide-react';

const SendMoneyModal = ({ token, user, onClose, onSuccess }) => {
  const [receiverUpiId, setReceiverUpiId] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [step, setStep] = useState(1); // 1: Input form, 2: Confirmation
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(val);
  };

  const handleNext = (e) => {
    e.preventDefault();
    setError('');
    
    if (!receiverUpiId) {
      return setError("Receiver's UPI ID is required.");
    }
    if (receiverUpiId === user.upi_id) {
      return setError("You cannot send money to your own UPI ID.");
    }
    const transferAmount = parseFloat(amount);
    if (isNaN(transferAmount) || transferAmount <= 0) {
      return setError("Please enter a valid amount greater than ₹0.");
    }
    if (transferAmount > user.balance) {
      return setError("You don't have enough balance to complete this transaction.");
    }

    setStep(2);
  };

  const API_URL = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5005`;

  const handleConfirm = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await axios.post(
        `${API_URL}/api/transfer`,
        { receiverUpiId, amount, note },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      onSuccess(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'An error occurred. Please try again.');
      setStep(1);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <button onClick={onClose} className="modal-close-btn">
          <X size={24} />
        </button>
        
        <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1.5rem' }}>Send Money</h2>
        
        {error && <div className="text-error mb-4" style={{ padding: '0.75rem', backgroundColor: '#fef2f2', borderRadius: 'var(--radius-md)', fontSize: '0.875rem' }}>{error}</div>}

        {step === 1 && (
          <form onSubmit={handleNext}>
            <div className="form-group">
              <label className="form-label">Receiver UPI ID</label>
              <input
                type="text"
                className="form-input"
                placeholder="Enter receiver's UPI ID (e.g. rahul@projectupi)"
                value={receiverUpiId}
                onChange={(e) => setReceiverUpiId(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Amount (₹)</label>
              <input
                type="number"
                step="0.01"
                className="form-input"
                placeholder="Enter amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
            <div className="form-group mb-6">
              <label className="form-label">Transaction Note (Optional)</label>
              <input
                type="text"
                className="form-input"
                placeholder="What's this for?"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-primary w-full">Send Money</button>
          </form>
        )}

        {step === 2 && (
          <div>
            <div style={{ backgroundColor: '#f8fafc', padding: '1.5rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', border: '1px solid var(--border-color)' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem', color: 'var(--primary-color)' }}>Confirm Transaction</h3>
              <div style={{ display: 'grid', gap: '0.75rem', fontSize: '0.875rem' }}>
                <div className="flex justify-between">
                  <span className="text-muted">Receiver UPI ID:</span>
                  <span style={{ fontWeight: '500' }}>{receiverUpiId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Amount:</span>
                  <span style={{ fontWeight: '700', fontSize: '1.125rem' }}>{formatCurrency(amount)}</span>
                </div>
                <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '0.5rem 0' }} />
                <div className="flex justify-between">
                  <span className="text-muted">Your Balance After Transfer:</span>
                  <span style={{ fontWeight: '500' }}>{formatCurrency(user.balance - parseFloat(amount))}</span>
                </div>
              </div>
            </div>
            
            <div className="flex gap-4">
              <button 
                className="btn btn-outline w-full"
                onClick={() => setStep(1)}
                disabled={loading}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary w-full"
                onClick={handleConfirm}
                disabled={loading}
              >
                {loading ? 'Processing...' : 'Confirm & Send'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SendMoneyModal;
