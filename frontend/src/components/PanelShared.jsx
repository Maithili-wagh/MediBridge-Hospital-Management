export function PanelTitle({ title, text }) {
  return (
    <div className="dashboard-head">
      <h1>{title}</h1>
      <p>{text}</p>
    </div>
  );
}

export function ProfileCard({ user }) {
  const profile = user?.doctorProfile;
  const rows = [
    ["Name", user?.name],
    ["Email", user?.email],
    ["Phone", user?.phone],
    ["Role", user?.role],
    ["OPD ID", user?.opdId],
    ["Approval", user?.approvalStatus],
    ["Specialty", profile?.specialty],
    ["Degree", profile?.degree],
    ["Hospital", profile?.hospital],
    ["City", profile?.city],
    ["Fee", profile?.fee ? `Rs ${profile.fee}` : ""],
    ["Status", profile?.status]
  ].filter(([, value]) => value);

  return (
    <div className="profile-card">
      <div className="avatar">{user?.name?.split(" ").map((part) => part[0]).join("").slice(0, 2) || "U"}</div>
      <div>
        <h2>My Profile</h2>
        <div className="profile-grid">
          {rows.map(([label, value]) => (
            <span key={label}>
              <small>{label}</small>
              <strong>{value}</strong>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
