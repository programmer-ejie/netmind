import { Play, BookOpen, BarChart3, CheckSquare, Layout, Settings, Users, Home } from "lucide-react";

const sidebarItems = [
  { icon: Home, label: "Dashboard" },
  { icon: BookOpen, label: "My Courses" },
  { icon: Play, label: "Video Lessons" },
  { icon: BarChart3, label: "Progress" },
  { icon: Users, label: "Community" },
  { icon: Settings, label: "Settings" },
];

const completedModules = [
  "Cyber Security Fundamentals",
  "Networking Basics",
  "Ethical Hacking Tools",
];

const DashboardPreview = () => (
  <section className="section-padding">
    <div className="container mx-auto">
      <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
        Your Learning <span className="glow-text">Dashboard</span>
      </h2>
      <div className="glass-card overflow-hidden rounded-2xl max-w-5xl mx-auto">
        <div className="flex min-h-[400px]">
          {/* Sidebar */}
          <div className="hidden md:flex flex-col w-56 border-r border-border/50 p-4 gap-1">
            <span className="text-sm font-bold glow-text mb-4 px-3">CyberSec LMS</span>
            {sidebarItems.map(({ icon: Icon, label }) => (
              <div
                key={label}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  label === "Video Lessons"
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon size={16} />
                {label}
              </div>
            ))}
          </div>

          {/* Main content */}
          <div className="flex-1 p-6">
            <h3 className="font-semibold mb-4">Ethical Hacking Masterclass</h3>
            {/* Video placeholder */}
            <div className="glass-card aspect-video rounded-xl flex items-center justify-center mb-6">
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                <Play className="text-primary ml-1" size={28} />
              </div>
            </div>

            {/* Progress */}
            <div className="mb-6">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">Overall Progress</span>
                <span className="font-semibold glow-text">70%</span>
              </div>
              <div className="h-2 rounded-full bg-secondary">
                <div className="h-full rounded-full bg-primary w-[70%] transition-all" />
              </div>
            </div>

            {/* Completed */}
            <div>
              <h4 className="text-sm font-semibold mb-3">Completed Modules</h4>
              <div className="space-y-2">
                {completedModules.map((m) => (
                  <div key={m} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckSquare className="text-primary" size={16} />
                    {m}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
);

export default DashboardPreview;
