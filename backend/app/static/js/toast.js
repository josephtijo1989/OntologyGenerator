// In-App Toast Alert System (Bottom Right, Auto Fade after 2s)
window.showToast = function(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast-card toast-${type}`;
  
  let icon = 'ℹ️';
  let borderColor = '#06b6d4';
  let bgGradient = 'linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.95))';
  
  if (type === 'success') {
    icon = '✅';
    borderColor = '#10b981';
  } else if (type === 'error') {
    icon = '⚠️';
    borderColor = '#f43f5e';
  } else if (type === 'warning') {
    icon = '⚡';
    borderColor = '#f59e0b';
  }

  toast.style.cssText = `
    background: ${bgGradient};
    color: #f8fafc;
    border: 1px solid ${borderColor};
    border-left: 4px solid ${borderColor};
    padding: 12px 18px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 10px;
    box-shadow: 0 10px 25px rgba(0,0,0,0.5);
    backdrop-filter: blur(12px);
    pointer-events: auto;
    transform: translateY(20px);
    opacity: 0;
    transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease;
    min-width: 280px;
    max-width: 420px;
  `;

  toast.innerHTML = `<span style="font-size: 16px;">${icon}</span><span>${message}</span>`;
  container.appendChild(toast);

  requestAnimationFrame(() => {
    toast.style.transform = 'translateY(0)';
    toast.style.opacity = '1';
  });

  // Fade out and remove after 2 seconds
  setTimeout(() => {
    toast.style.transform = 'translateY(10px)';
    toast.style.opacity = '0';
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }, 2000);
};

// Override native browser alert to route all application alerts into in-app bottom-right toast
window.alert = function(msg) {
  const str = String(msg || '');
  let type = 'info';
  const sLower = str.toLowerCase();
  if (sLower.includes('success') || sLower.includes('completed') || sLower.includes('created') || sLower.includes('updated')) {
    type = 'success';
  } else if (sLower.includes('error') || sLower.includes('fail') || sLower.includes('required') || sLower.includes('please')) {
    type = 'error';
  } else if (sLower.includes('warning') || sLower.includes('test')) {
    type = 'warning';
  }
  showToast(str, type);
};
