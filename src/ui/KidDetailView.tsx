// src/ui/KidDetailView.tsx
import { useContext } from 'react';
import { useParams, Link } from 'react-router-dom'; // Import Link for a back button
import { UserContext } from '../contexts/UserContext';
// Assuming Kid type is in ../types (but not directly used here after inspection)

const KidDetailView = () => {
  const { kidId } = useParams<{ kidId: string }>();
  const userContext = useContext(UserContext);

  if (userContext?.loading) {
    return <p>Loading kid details...</p>;
  }

  const kid = userContext?.user?.kids?.find(k => k.id === kidId);

  if (!kid) {
    return (
      <div>
        <p>Kid not found.</p>
        <Link to="/settings">Back to Settings</Link>
      </div>
    );
  }

  return (
    <div className="kid-detail-view" style={{ padding: '16px' }}>
      <header className="view-header">
        <h1>Kid Details: {kid.name}</h1>
      </header>
      <section style={{ background: 'white', padding: '16px', borderRadius: '4px', boxShadow: '0 1px 3px rgba(0,0,0,0.12)' }}>
        <p><strong>Name:</strong> {kid.name}</p>
        <p><strong>Age:</strong> {kid.age || 'N/A'}</p>
        <p><strong>ID:</strong> {kid.id}</p>

        <h4 style={{marginTop: '20px'}}>More Details:</h4>
        <p>[Placeholder for more kid-specific details, e.g., allowance settings, chores, specific transactions, goals etc.]</p>

        <div style={{ marginTop: '20px' }}>
          <Link to="/settings" className="button-link-styled">Back to Settings</Link>
        </div>
      </section>
    </div>
  );
};

// Add some basic styles for the link to look like a button, if desired, in styles.css later.
// For now, this is just a functional component.
// We can add a .button-link-styled class in styles.css:
// .button-link-styled {
//   display: inline-block;
//   padding: 10px 16px;
//   background-color: #6200ee;
//   color: white;
//   text-decoration: none;
//   border-radius: 4px;
//   text-align: center;
// }
// .button-link-styled:hover {
//   background-color: #3700b3;
// }


export default KidDetailView;
