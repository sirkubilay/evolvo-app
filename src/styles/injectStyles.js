const injectStyles = () => {
  if (typeof document === 'undefined' || document.getElementById('evolvo-global-styles')) return;
  const style = document.createElement('style');
  style.id = 'evolvo-global-styles';
  style.innerHTML = `
    .shadow-blue-500\\/30 { box-shadow: 0 0 20px 2px rgba(59, 130, 246, 0.3); }
    .shadow-green-500\\/30 { box-shadow: 0 0 20px 2px rgba(34, 197, 94, 0.3); }
    @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-5px); } 75% { transform: translateX(5px); } } 
    .animate-shake { animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both; }
    
    @keyframes flip-letter { 0% { transform: rotateX(-90deg); opacity: 0; } 100% { transform: rotateX(0); opacity: 1; } }
    .animate-flip-letter { animation: flip-letter 0.5s ease-out both; backface-visibility: hidden; }
    
    @keyframes flip-correct { 
       0% { transform: rotateX(0deg); background-color: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.1); color: white;} 
       49% { background-color: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.1); color: transparent;}
       50% { transform: rotateX(-90deg); background-color: #16a34a; border-color: #15803d; color: transparent; } 
       51% { color: white; }
       100% { transform: rotateX(0deg); background-color: #16a34a; border-color: #15803d; color: white; } 
    }
    .animate-flip-correct { animation: flip-correct 0.6s ease-in-out forwards !important; backface-visibility: hidden; }
    
    .scrollbar-thin::-webkit-scrollbar { width: 4px; }
    .scrollbar-thumb-white\\/10::-webkit-scrollbar-thumb { background-color: rgba(255, 255, 255, 0.1); border-radius: 10px; }
    @keyframes altayBrandIn { from{opacity:0} to{opacity:0.35} }
  `;
  document.head.appendChild(style);
};
injectStyles();
