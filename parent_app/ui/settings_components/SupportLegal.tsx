// parent_app/ui/settings_components/SupportLegal.tsx
const SupportLegal = () => {
  return (
    <div className="settings-section">
      <h2>Support & Legal</h2>
      <div className="settings-item"><a href="#" onClick={(e) => e.preventDefault()}>Help Center / FAQ</a></div>
      <div className="settings-item"><a href="#" onClick={(e) => e.preventDefault()}>Contact Support</a></div>
      <div className="settings-item"><a href="#" onClick={(e) => e.preventDefault()}>Terms of Service</a></div>
      <div className="settings-item"><a href="#" onClick={(e) => e.preventDefault()}>Privacy Policy</a></div>
      <div className="settings-item"><p>App Version: 1.0.0 (Alpha)</p></div>
    </div>
  );
};
export default SupportLegal;
