import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ContributeInfoPage = () => {
  const { isAuthenticated } = useAuth();
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Contribute to the EV Database</h1>

      <div className="card bg-base-100 shadow-xl mb-6">
        <div className="card-body">
          <h2 className="card-title">How contributions work</h2>
          <p>
            Anyone can submit new EV data. Submissions are reviewed by moderators and the community can upvote pending contributions.
          </p>
          <ul className="list-disc list-inside space-y-1">
            <li>Provide accurate make, model, year. Add battery capacity, range, and charging speed when possible.</li>
            <li>Only verifiable facts; avoid estimates and marketing language.</li>
            <li>Search before submitting to prevent duplicates.</li>
            <li>Use the dashboard to track your submissions and cancel pending ones if needed.</li>
          </ul>
        </div>
      </div>

      <div className="card bg-base-100 shadow-xl mb-6">
        <div className="card-body">
          <h2 className="card-title">Credits (App Currency)</h2>
          <p>
            You earn credits when your contributions are approved. Credits may unlock features or recognition in the future.
          </p>
          <ul className="list-disc list-inside space-y-1">
            <li>+10 credits for each approved contribution.</li>
            <li>No credits for rejected submissions.</li>
            <li>Voting and helpful activity may be rewarded later.</li>
          </ul>
        </div>
      </div>

      <div className="card bg-base-100 shadow-xl mb-6">
        <div className="card-body">
          <h2 className="card-title">Community Guidelines</h2>
          <ul className="list-disc list-inside space-y-1">
            <li>Be respectful and constructive.</li>
            <li>Prefer official specs or trusted sources.</li>
            <li>Use consistent units (kWh, km, kW).</li>
            <li>Moderators may refine or request more info.</li>
          </ul>
        </div>
      </div>

      <div className="flex gap-2">
        <Link to="/contributions/browse" className="btn btn-outline btn-primary">Browse Contributions</Link>
        {isAuthenticated ? (
          <Link to="/contribute/vehicle" className="btn btn-primary">Submit a Contribution</Link>
        ) : (
          <Link to="/register" className="btn btn-primary">Create an Account</Link>
        )}
      </div>
    </div>
  );
};

export default ContributeInfoPage;
