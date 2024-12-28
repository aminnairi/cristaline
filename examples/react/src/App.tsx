import { Link, Route, Routes } from "react-router";
import { HomePage } from "./pages/HomePage";
import { UserDetailsPage } from "./pages/UserDetailsPage";
import { EventsPage } from "./pages/EventsPage";

export default function App() {
  return (
    <div>
      <header>
        <ul>
          <li>
            <Link to="/">
              Home
            </Link>
          </li>
          <li>
            <Link to="/events">
              Events
            </Link>
          </li>
        </ul>
      </header>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/users/:userId" element={<UserDetailsPage />} />
        <Route path="/events" element={<EventsPage />} />
      </Routes>
    </div>
  );
}