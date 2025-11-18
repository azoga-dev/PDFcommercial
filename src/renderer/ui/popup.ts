export function showPopup(message: string, timeout = 8000) {
  let popup = document.getElementById('app-popup') as HTMLDivElement | null;
  if (!popup) {
    popup = document.createElement('div');
    popup.id = 'app-popup';
    popup.className = 'app-popup hidden';
    popup.style.position = 'fixed';
    popup.style.bottom = '20px';
    popup.style.right = '20px';
    popup.style.padding = '12px 20px';
    popup.style.borderRadius = '8px';
    popup.style.boxShadow = '0 4px 10px rgba(0,0,0,0.2)';
    popup.style.zIndex = '9999';
    popup.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    document.body.appendChild(popup);
  }
  popup.textContent = message;
  popup.classList.remove('hidden');
  requestAnimationFrame(() => {
    popup!.style.opacity = '1';
    popup!.style.transform = 'translateY(0)';
  });
  setTimeout(() => {
    popup!.style.opacity = '0';
    popup!.style.transform = 'translateY(20px)';
    setTimeout(() => popup?.classList.add('hidden'), 300);
  }, timeout);
}