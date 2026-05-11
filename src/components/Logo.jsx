const Logo = ({ colors }) => (
  <div className="flex items-center gap-1.5 font-black text-2xl tracking-tighter italic select-none">
    <span>E</span><span>V</span>
    <span className={`w-7 h-7 flex items-center justify-center text-white not-italic text-lg rounded-md shadow-lg ${colors?.logoError ? colors.logoError : 'bg-red-600'}`}>O</span>
    <span>L</span><span>V</span>
    <span className={`w-7 h-7 flex items-center justify-center text-white not-italic text-lg rounded-md shadow-lg ${colors?.logoSuccess ? colors.logoSuccess : 'bg-green-600'}`}>O</span>
  </div>
);

export default Logo;
