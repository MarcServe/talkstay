import { useState } from "react";
import { Play, Clock, Film } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

type Category = "All" | "Widget" | "Voice Link" | "QR" | "Features";

interface DemoClip {
  id: number;
  title: string;
  category: Category;
  description: string;
  duration: string;
  videoUrl: string;
  gradient: string;
  icon: string;
}

const demoClips: DemoClip[] = [
  {
    id: 1,
    title: "Website Widget Setup",
    category: "Widget",
    description: "How to add TalkWeb to your website in 2 minutes",
    duration: "2:00",
    videoUrl: "",
    gradient: "from-primary/60 to-primary/20",
    icon: "🌐",
  },
  {
    id: 2,
    title: "Voice Web Link",
    category: "Voice Link",
    description: "Share a direct voice assistant link anywhere",
    duration: "1:30",
    videoUrl: "",
    gradient: "from-accent/60 to-accent/20",
    icon: "🔗",
  },
  {
    id: 3,
    title: "QR Code for Physical Spaces",
    category: "QR",
    description: "Print a QR code for waiting rooms and offices",
    duration: "1:15",
    videoUrl: "",
    gradient: "from-secondary/60 to-secondary/20",
    icon: "📱",
  },
  {
    id: 4,
    title: "Document AI Companion",
    category: "Features",
    description: "Let visitors ask questions about PDFs and policies",
    duration: "2:30",
    videoUrl: "",
    gradient: "from-primary/50 to-accent/30",
    icon: "📄",
  },
  {
    id: 5,
    title: "Booking & Scheduling",
    category: "Features",
    description: "Voice-powered appointment booking",
    duration: "2:00",
    videoUrl: "",
    gradient: "from-accent/50 to-primary/30",
    icon: "📅",
  },
  {
    id: 6,
    title: "57+ Languages",
    category: "Features",
    description: "Multilingual support in action",
    duration: "1:45",
    videoUrl: "",
    gradient: "from-secondary/50 to-primary/30",
    icon: "🌍",
  },
  {
    id: 7,
    title: "WhatsApp Integration",
    category: "Voice Link",
    description: "Send voice assistant links via messaging",
    duration: "1:30",
    videoUrl: "",
    gradient: "from-primary/40 to-secondary/40",
    icon: "💬",
  },
  {
    id: 8,
    title: "Mobile Experience",
    category: "Widget",
    description: "Responsive widget on phones and tablets",
    duration: "1:15",
    videoUrl: "",
    gradient: "from-accent/40 to-secondary/40",
    icon: "📲",
  },
  {
    id: 9,
    title: "Creating Your Assistant",
    category: "Widget",
    description: "Step-by-step assistant creation walkthrough",
    duration: "3:00",
    videoUrl: "",
    gradient: "from-primary/60 to-secondary/30",
    icon: "🤖",
  },
];

const categories: Category[] = ["All", "Widget", "Voice Link", "QR", "Features"];

export const VideoShowcase = () => {
  const [activeCategory, setActiveCategory] = useState<Category>("All");
  const [selectedClip, setSelectedClip] = useState<DemoClip | null>(null);

  const filteredClips =
    activeCategory === "All"
      ? demoClips
      : demoClips.filter((c) => c.category === activeCategory);

  return (
    <section
      className="py-16 md:py-24 bg-muted/30 border-t border-border"
      aria-label="Video demos showing how TalkWeb works"
    >
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            <Film className="w-4 h-4" aria-hidden="true" />
            Quick video demos
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
            See How TalkWeb <span className="ai-gradient-text">Works</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Short clips for every feature — watch how easy it is to set up and
            start using TalkWeb.
          </p>
        </div>

        {/* Filter tabs */}
        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                activeCategory === cat
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-card text-muted-foreground border border-border hover:bg-accent hover:text-accent-foreground"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Card grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {filteredClips.map((clip) => (
            <div
              key={clip.id}
              className="group bg-card border border-border rounded-2xl overflow-hidden text-left opacity-80 cursor-default"
            >
              {/* Thumbnail placeholder */}
              <div
                className={`relative aspect-video bg-gradient-to-br ${clip.gradient} flex flex-col items-center justify-center gap-2`}
              >
                <span className="text-6xl" aria-hidden="true">
                  {clip.icon}
                </span>
              </div>

              {/* Info */}
              <div className="p-4 space-y-1">
                <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                  {clip.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {clip.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Video modal */}
      <Dialog
        open={!!selectedClip}
        onOpenChange={(open) => !open && setSelectedClip(null)}
      >
        <DialogContent className="max-w-3xl p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle>{selectedClip?.title}</DialogTitle>
            <DialogDescription>{selectedClip?.description}</DialogDescription>
          </DialogHeader>
          <div className="p-6 pt-4">
            {selectedClip?.videoUrl ? (
              <div className="aspect-video rounded-lg overflow-hidden">
                <iframe
                  src={selectedClip.videoUrl}
                  title={selectedClip.title}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            ) : (
              <div className="aspect-video rounded-lg bg-muted flex flex-col items-center justify-center gap-3">
                <span className="text-5xl">{selectedClip?.icon}</span>
                <p className="text-muted-foreground font-medium">
                  Video coming soon
                </p>
                <p className="text-sm text-muted-foreground/70">
                  This demo clip is being recorded and will be available shortly.
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
};
