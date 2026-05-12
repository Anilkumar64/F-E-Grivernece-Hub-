/**
 * Admin Creation Form with Phone Number and OTP Verification
 * Enhanced form for creating admins with email/SMS verification
 */
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const AdminCreationForm = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role: 'admin',
    department: '',
    staffId: '',
    verificationMethod: 'email' // 'email' or 'phone'
  });

  const [verificationData, setVerificationData] = useState({
    code: '',
    isSent: false,
    isVerified: false,
    expiresAt: null
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // Step 1: Form, Step 2: Verification, Step 3: Success
  const [departments, setDepartments] = useState([]);
  const [countdown, setCountdown] = useState(0);

  // Fetch departments on component mount
  useEffect(() => {
    fetchDepartments();
  }, []);

  // Countdown timer for OTP expiry
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const fetchDepartments = async () => {
    try {
      const response = await axios.get('/api/departments');
      setDepartments(response.data);
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (formData.verificationMethod === 'phone') {
      if (!formData.phone.trim()) {
        newErrors.phone = 'Phone number is required for phone verification';
      } else if (!/^\+?[\d\s\-()]+$/.test(formData.phone)) {
        newErrors.phone = 'Invalid phone number format';
      }
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (formData.role === 'admin') {
      if (!formData.department) {
        newErrors.department = 'Department is required for admin role';
      }
      if (!formData.staffId.trim()) {
        newErrors.staffId = 'Staff ID is required for admin role';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleVerificationMethodChange = (method) => {
    setFormData(prev => ({
      ...prev,
      verificationMethod: method
    }));
    // Reset verification data
    setVerificationData({
      code: '',
      isSent: false,
      isVerified: false,
      expiresAt: null
    });
    setCountdown(0);
  };

  const sendVerificationCode = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const payload = {
        email: formData.email,
        phone: formData.phone,
        type: formData.verificationMethod
      };

      const response = await axios.post('/api/otp/send-code', payload);

      if (response.data.success) {
        setVerificationData(prev => ({
          ...prev,
          isSent: true,
          expiresAt: response.data.expiresAt
        }));
        
        // Start countdown (10 minutes = 600 seconds)
        setCountdown(600);
        setStep(2);
      } else {
        setErrors({ submit: response.data.message });
      }
    } catch (error) {
      setErrors({ submit: error.response?.data?.message || 'Failed to send verification code' });
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async () => {
    if (!verificationData.code.trim()) {
      setErrors({ code: 'Verification code is required' });
      return;
    }

    setLoading(true);
    try {
      const endpoint = formData.verificationMethod === 'email' 
        ? '/api/otp/verify/email' 
        : '/api/otp/verify/phone';

      const response = await axios.post(endpoint, {
        code: verificationData.code
      });

      if (response.data.success) {
        setVerificationData(prev => ({
          ...prev,
          isVerified: true
        }));
        setStep(3);
        createAdmin();
      } else {
        setErrors({ code: response.data.message });
      }
    } catch (error) {
      setErrors({ code: error.response?.data?.message || 'Verification failed' });
    } finally {
      setLoading(false);
    }
  };

  const createAdmin = async () => {
    setLoading(true);
    try {
      const adminData = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        role: formData.role,
        department: formData.department,
        staffId: formData.staffId,
        preferredVerification: formData.verificationMethod,
        emailVerified: formData.verificationMethod === 'email',
        phoneVerified: formData.verificationMethod === 'phone'
      };

      const response = await axios.post('/api/admin/create', adminData);

      if (response.data.success) {
        // Admin created successfully
        setStep(3);
      } else {
        setErrors({ submit: response.data.message });
      }
    } catch (error) {
      setErrors({ submit: error.response?.data?.message || 'Failed to create admin' });
    } finally {
      setLoading(false);
    }
  };

  const resendCode = async () => {
    setLoading(true);
    try {
      const payload = {
        email: formData.email,
        phone: formData.phone,
        type: formData.verificationMethod
      };

      const response = await axios.post('/api/otp/send-code', payload);

      if (response.data.success) {
        setVerificationData(prev => ({
          ...prev,
          isSent: true,
          expiresAt: response.data.expiresAt
        }));
        setCountdown(600);
        setErrors({}); // Clear any previous errors
      } else {
        setErrors({ submit: response.data.message });
      }
    } catch (error) {
      setErrors({ submit: error.response?.data?.message || 'Failed to resend verification code' });
    } finally {
      setLoading(false);
    }
  };

  const formatCountdown = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
      role: 'admin',
      department: '',
      staffId: '',
      verificationMethod: 'email'
    });
    setVerificationData({
      code: '',
      isSent: false,
      isVerified: false,
      expiresAt: null
    });
    setErrors({});
    setStep(1);
    setCountdown(0);
  };

  return (
    <div className="admin-creation-form">
      <div className="form-header">
        <h2>Create New Admin</h2>
        <div className="step-indicator">
          <div className={`step ${step >= 1 ? 'active' : ''}`}>1. Details</div>
          <div className={`step ${step >= 2 ? 'active' : ''}`}>2. Verify</div>
          <div className={`step ${step >= 3 ? 'active' : ''}`}>3. Complete</div>
        </div>
      </div>

      {step === 1 && (
        <div className="form-step">
          <div className="form-group">
            <label htmlFor="name">Full Name *</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className={errors.name ? 'error' : ''}
              placeholder="Enter full name"
            />
            {errors.name && <span className="error-message">{errors.name}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="email">Email Address *</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className={errors.email ? 'error' : ''}
              placeholder="Enter email address"
            />
            {errors.email && <span className="error-message">{errors.email}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="phone">Phone Number</label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              className={errors.phone ? 'error' : ''}
              placeholder="+1234567890"
            />
            {errors.phone && <span className="error-message">{errors.phone}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="password">Password *</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              className={errors.password ? 'error' : ''}
              placeholder="Enter password (min 8 characters)"
            />
            {errors.password && <span className="error-message">{errors.password}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password *</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              className={errors.confirmPassword ? 'error' : ''}
              placeholder="Confirm password"
            />
            {errors.confirmPassword && <span className="error-message">{errors.confirmPassword}</span>}
          </div>

          {formData.role === 'admin' && (
            <>
              <div className="form-group">
                <label htmlFor="department">Department *</label>
                <select
                  id="department"
                  name="department"
                  value={formData.department}
                  onChange={handleInputChange}
                  className={errors.department ? 'error' : ''}
                >
                  <option value="">Select Department</option>
                  {departments.map(dept => (
                    <option key={dept._id} value={dept._id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
                {errors.department && <span className="error-message">{errors.department}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="staffId">Staff ID *</label>
                <input
                  type="text"
                  id="staffId"
                  name="staffId"
                  value={formData.staffId}
                  onChange={handleInputChange}
                  className={errors.staffId ? 'error' : ''}
                  placeholder="Enter staff ID"
                />
                {errors.staffId && <span className="error-message">{errors.staffId}</span>}
              </div>
            </>
          )}

          <div className="form-group">
            <label className="radio-label">Verification Method *</label>
            <div className="radio-group">
              <label className="radio-option">
                <input
                  type="radio"
                  name="verificationMethod"
                  value="email"
                  checked={formData.verificationMethod === 'email'}
                  onChange={() => handleVerificationMethodChange('email')}
                />
                <span className="radio-text">Email Verification</span>
              </label>
              <label className="radio-option">
                <input
                  type="radio"
                  name="verificationMethod"
                  value="phone"
                  checked={formData.verificationMethod === 'phone'}
                  onChange={() => handleVerificationMethodChange('phone')}
                  disabled={!formData.phone}
                />
                <span className="radio-text">SMS Verification</span>
              </label>
            </div>
            <small className="form-help">
              {formData.verificationMethod === 'email' 
                ? 'A verification code will be sent to the email address.'
                : 'A verification code will be sent to the phone number.'}
            </small>
          </div>

          {errors.submit && (
            <div className="error-message global">{errors.submit}</div>
          )}

          <div className="form-actions">
            <button
              type="button"
              onClick={sendVerificationCode}
              disabled={loading}
              className="btn btn-primary"
            >
              {loading ? 'Sending...' : 'Send Verification Code'}
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="form-step verification-step">
          <div className="verification-info">
            <h3>Verify Your {formData.verificationMethod === 'email' ? 'Email' : 'Phone'}</h3>
            <p>
              We've sent a 6-digit verification code to:
              <strong>{formData.verificationMethod === 'email' ? formData.email : formData.phone}</strong>
            </p>
            {countdown > 0 && (
              <p className="countdown">
                Code expires in: <span className="timer">{formatCountdown(countdown)}</span>
              </p>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="verificationCode">Verification Code</label>
            <input
              type="text"
              id="verificationCode"
              value={verificationData.code}
              onChange={(e) => setVerificationData(prev => ({ ...prev, code: e.target.value }))}
              className={errors.code ? 'error' : ''}
              placeholder="Enter 6-digit code"
              maxLength={6}
            />
            {errors.code && <span className="error-message">{errors.code}</span>}
          </div>

          <div className="form-actions">
            <button
              type="button"
              onClick={verifyCode}
              disabled={loading || verificationData.code.length !== 6}
              className="btn btn-primary"
            >
              {loading ? 'Verifying...' : 'Verify Code'}
            </button>
            
            <button
              type="button"
              onClick={resendCode}
              disabled={loading || countdown > 0}
              className="btn btn-secondary"
            >
              {countdown > 0 ? `Resend in ${formatCountdown(countdown)}` : 'Resend Code'}
            </button>

            <button
              type="button"
              onClick={() => setStep(1)}
              className="btn btn-outline"
            >
              Back
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="form-step success-step">
          <div className="success-content">
            <div className="success-icon">✓</div>
            <h3>Admin Created Successfully!</h3>
            <p>
              <strong>{formData.name}</strong> has been created as a {formData.role} and 
              verified via {formData.verificationMethod}.
            </p>
            <div className="admin-details">
              <p><strong>Email:</strong> {formData.email}</p>
              {formData.phone && <p><strong>Phone:</strong> {formData.phone}</p>}
              <p><strong>Role:</strong> {formData.role}</p>
              {formData.role === 'admin' && (
                <>
                  <p><strong>Department:</strong> {departments.find(d => d._id === formData.department)?.name}</p>
                  <p><strong>Staff ID:</strong> {formData.staffId}</p>
                </>
              )}
            </div>
          </div>

          <div className="form-actions">
            <button
              type="button"
              onClick={resetForm}
              className="btn btn-primary"
            >
              Create Another Admin
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        .admin-creation-form {
          max-width: 600px;
          margin: 0 auto;
          padding: 2rem;
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }

        .form-header {
          text-align: center;
          margin-bottom: 2rem;
        }

        .form-header h2 {
          color: #333;
          margin-bottom: 1rem;
        }

        .step-indicator {
          display: flex;
          justify-content: center;
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .step {
          padding: 0.5rem 1rem;
          background: #f8f9fa;
          border-radius: 20px;
          font-size: 0.9rem;
          color: #666;
        }

        .step.active {
          background: #007bff;
          color: white;
        }

        .form-step {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .form-group label {
          font-weight: 600;
          color: #333;
        }

        .form-group input,
        .form-group select {
          padding: 0.75rem;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 1rem;
        }

        .form-group input.error,
        .form-group select.error {
          border-color: #dc3545;
        }

        .error-message {
          color: #dc3545;
          font-size: 0.875rem;
        }

        .error-message.global {
          padding: 1rem;
          background: #f8d7da;
          border: 1px solid #f5c6cb;
          border-radius: 4px;
        }

        .radio-group {
          display: flex;
          gap: 1rem;
          margin-top: 0.5rem;
        }

        .radio-option {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
        }

        .radio-option input:disabled + .radio-text {
          color: #999;
        }

        .form-help {
          color: #666;
          font-size: 0.875rem;
        }

        .form-actions {
          display: flex;
          gap: 1rem;
          justify-content: center;
          margin-top: 1rem;
        }

        .btn {
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 4px;
          font-size: 1rem;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-primary {
          background: #007bff;
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background: #0056b3;
        }

        .btn-secondary {
          background: #6c757d;
          color: white;
        }

        .btn-secondary:hover:not(:disabled) {
          background: #545b62;
        }

        .btn-outline {
          background: white;
          color: #007bff;
          border: 1px solid #007bff;
        }

        .btn-outline:hover {
          background: #007bff;
          color: white;
        }

        .verification-step {
          text-align: center;
        }

        .verification-info h3 {
          color: #333;
          margin-bottom: 1rem;
        }

        .verification-info p {
          color: #666;
          margin-bottom: 0.5rem;
        }

        .countdown {
          color: #007bff;
          font-weight: 600;
        }

        .timer {
          color: #dc3545;
        }

        .success-step {
          text-align: center;
        }

        .success-icon {
          width: 60px;
          height: 60px;
          background: #28a745;
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2rem;
          margin: 0 auto 1rem;
        }

        .success-content h3 {
          color: #333;
          margin-bottom: 1rem;
        }

        .admin-details {
          background: #f8f9fa;
          padding: 1rem;
          border-radius: 4px;
          margin: 1rem 0;
          text-align: left;
        }

        .admin-details p {
          margin: 0.5rem 0;
        }

        @media (max-width: 768px) {
          .admin-creation-form {
            padding: 1rem;
          }

          .step-indicator {
            flex-direction: column;
            gap: 0.5rem;
          }

          .form-actions {
            flex-direction: column;
          }

          .radio-group {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
};

export default AdminCreationForm;
