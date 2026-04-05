"use client";
import { useState, useEffect } from "react";
import Sidebar from "./components/Sidebar";
import "./globals.css";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    // Auto-open on very large screens for convenience? 
    // Let's stick to toggle-only as requested for clean look.
  }, []);

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
        <title>Olive Executive Dashboard</title>
      </head>
      <body suppressHydrationWarning style={{ margin: 0, padding: 0, background: "#F8FAFC" }}>
        <div style={{ display: "flex", minHeight: "100vh" }}>
          
          <Sidebar 
            isOpen={isSidebarOpen} 
            onClose={() => setIsSidebarOpen(false)} 
          />

          <main style={{ 
            flex: 1, 
            minHeight: "100vh", 
            // When sidebar is open, we push the content if it's small, 
            // but on dashboard we usually overlay or use padding
            paddingLeft: isSidebarOpen ? "240px" : "0px",
            transition: "padding-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            position: "relative"
          }}>
            
            {/* Clickable Overlay when Sidebar is open */}
            {isSidebarOpen && (
              <div 
                onClick={() => setIsSidebarOpen(false)}
                style={{
                  position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
                  background: "rgba(0,0,0,0.15)", zIndex: 40,
                  cursor: "pointer"
                }}
              />
            )}

            {/* GLOBAL CENTERED CONTAINER */}
            <div style={{ 
              maxWidth: "1400px", 
              margin: "0 auto", 
              padding: "0 40px",
              minHeight: "100vh",
              display: "flex",
              flexDirection: "column"
            }}>
              
              {/* TOP HEADER / BAR */}
              <div style={{ 
                display: "flex", 
                alignItems: "center", 
                padding: "24px 0",
                gap: "24px" 
              }}>
                {/* 3 Horizontal Line Toggle - Aligned with Content */}
                {!isSidebarOpen && (
                  <button 
                    onClick={() => setIsSidebarOpen(true)}
                    style={{
                      display: "flex", flexDirection: "column", justifyContent: "space-between",
                      width: "24px", height: "16px", background: "transparent",
                      border: "none", cursor: "pointer", padding: 0, flexShrink: 0
                    }}
                  >
                    <span style={{ width: "100%", height: "2px", background: "#0f172a", borderRadius: "1px" }} />
                    <span style={{ width: "100%", height: "2px", background: "#0f172a", borderRadius: "1px" }} />
                    <span style={{ width: "100%", height: "2px", background: "#0f172a", borderRadius: "1px" }} />
                  </button>
                )}
                {/* Space for the hamburger when closed, ensuring alignment stays consistent */}
                {isSidebarOpen && <div style={{ width: "24px" }} />}
              </div>

              {/* MAIN CONTENT AREA */}
              <div style={{ flex: 1, paddingBottom: "60px" }}>
                {children}
              </div>
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}
