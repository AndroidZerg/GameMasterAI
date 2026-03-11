import Breadcrumb from "./Breadcrumb";

export default function CustomizeHomePage() {
  return (
    <div style={{ padding: "70px 20px 40px", maxWidth: "600px", margin: "0 auto" }}>
      <Breadcrumb items={[{ label: "Admin" }, { label: "Customize Home" }]} />
      <h1 style={{ fontSize: "1.5rem", marginBottom: "24px", color: "var(--text-primary)" }}>
        Customize Home
      </h1>
      <p style={{ color: "var(--text-secondary)" }}>Loading new system...</p>
    </div>
  );
}
