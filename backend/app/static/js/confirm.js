// In-App Confirmation Modal System
let confirmResolver = null;

window.showConfirm = function(message, title = 'Confirm Action', confirmBtnText = 'Confirm') {
  return new Promise((resolve) => {
    confirmResolver = resolve;
    document.getElementById('confirmModalTitle').innerHTML = `<span>⚠️</span> <span>${title}</span>`;
    document.getElementById('confirmModalMessage').innerText = message;
    
    const submitBtn = document.getElementById('confirmModalSubmitBtn');
    submitBtn.innerText = confirmBtnText;
    submitBtn.onclick = function() {
      closeConfirmModal(true);
    };

    openModal('confirmModal');
  });
};

window.closeConfirmModal = function(result) {
  closeModal('confirmModal');
  if (confirmResolver) {
    confirmResolver(result);
    confirmResolver = null;
  }
};
