'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Tablet,
  Tv,
  MapPin,
  BarChart3,
  ArrowRight,
  ShieldCheck,
  Star,
  UtensilsCrossed,
  ChevronLeft,
  ChevronRight,
  CheckCircle2
} from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { config } from '@/config';

// Import local assets
import imgTablet1 from '@/assets/Tablet/IMG_20260615_145746.png';
import imgTablet2 from '@/assets/Tablet/IMG_20260615_145806.png';
import imgTablet3 from '@/assets/Tablet/IMG_20260615_145827.png';
import imgTablet4 from '@/assets/Tablet/New Project.png';

import imgScreen1 from '@/assets/Screen/HUAWEI-IdeaHub-S-HUAWEI-IdeaHub-Pro-angle.webp';
import imgScreen2 from '@/assets/Screen/M6APro_V2-EDLA.webp';
import imgAibotLogo from '@/assets/Aibot_Logo.png';

const tabletImages = [imgTablet1, imgTablet2, imgTablet3, imgTablet4];
const screenImages = [imgScreen1, imgScreen2];

export default function LandingPage() {
  const [activeTab, setActiveTab] = useState('tablet');
  const [tabletIndex, setTabletIndex] = useState(0);
  const [screenIndex, setScreenIndex] = useState(0);
  const [userPortalUrl, setUserPortalUrl] = useState('http://localhost:3001');

  useEffect(() => {
    setUserPortalUrl(config.userPortalUrl);
  }, []);

  // Auto-slide slideshow for both carousels
  useEffect(() => {
    const timer = setInterval(() => {
      setTabletIndex((prev) => (prev + 1) % tabletImages.length);
      setScreenIndex((prev) => (prev + 1) % screenImages.length);
    }, 4000); // changes slide every 4 seconds
    return () => clearInterval(timer);
  }, []);

  const features = [
    {
      icon: <Tablet className="w-8 h-8 text-blue-500 dark:text-blue-400" />,
      title: "Tabletop Ordering Tablet",
      description: "Interactive vertical kiosk placed on dining tables. Showcases full-screen digital ads when idle, and transitions to the food menu on touch."
    },
    {
      icon: <Tv className="w-8 h-8 text-indigo-500 dark:text-indigo-400" />,
      title: "Landscape Advertising Screen",
      description: "24/7 high-brightness display screens for venue walls. Optimized for non-intrusive local advertising loops with a tracking QR code."
    },
    {
      icon: <MapPin className="w-8 h-8 text-cyan-500 dark:text-cyan-400" />,
      title: "Targeted Ad Booking",
      description: "Book ad spots directly via location selectors (State → City → Outlet). Target exactly the audiences that match your demographic."
    },
    {
      icon: <BarChart3 className="w-8 h-8 text-emerald-500 dark:text-emerald-400" />,
      title: "Real-time Telemetry & Tracking",
      description: "Measure campaign ROI with built-in analytics tracking ad display durations, interactive button clicks, and QR code scans."
    }
  ];

  // Carousel slide handlers
  const nextTabletSlide = () => {
    setTabletIndex((prev) => (prev + 1) % tabletImages.length);
  };
  const prevTabletSlide = () => {
    setTabletIndex((prev) => (prev - 1 + tabletImages.length) % tabletImages.length);
  };

  const nextScreenSlide = () => {
    setScreenIndex((prev) => (prev + 1) % screenImages.length);
  };
  const prevScreenSlide = () => {
    setScreenIndex((prev) => (prev - 1 + screenImages.length) % screenImages.length);
  };

  // Animation variants
  const fadeInUp = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15
      }
    }
  };

  const slideVariants = {
    initial: (direction) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0
    }),
    animate: {
      x: 0,
      opacity: 1,
      transition: { x: { type: "spring", stiffness: 300, damping: 30 }, opacity: { duration: 0.2 } }
    },
    exit: (direction) => ({
      x: direction < 0 ? 300 : -300,
      opacity: 0,
      transition: { x: { type: "spring", stiffness: 300, damping: 30 }, opacity: { duration: 0.2 } }
    })
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between overflow-x-hidden">
      {/* Navigation Header */}
      <header className="fixed top-0 left-0 right-0 z-50 glassmorphism bg-background/80 border-b border-border">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center space-x-8">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              className="flex items-center space-x-2"
            >
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
                <UtensilsCrossed className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="font-outfit text-lg font-bold tracking-tight text-foreground leading-none">
                Digi<span className="text-blue-500">Ads</span>
              </span>
            </motion.div>

            <nav className="hidden md:flex items-center space-x-6 text-xs font-semibold text-muted-foreground">
              <a href="#features" className="hover:text-foreground transition-colors">Features</a>
              <a href="#demo" className="hover:text-foreground transition-colors">Device Demo</a>
              <a href="#about" className="hover:text-foreground transition-colors">About Us</a>
            </nav>
          </div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center space-x-4"
          >
            <a
              href={`${userPortalUrl}/login`}
              className="text-sm font-semibold text-muted-foreground hover:text-foreground px-4 py-2 transition-colors"
            >
              Sign In
            </a>
            <ThemeToggle />
          </motion.div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-36 pb-24 px-6 overflow-hidden">
        {/* Decorative Gradients */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-600/5 dark:bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-1/3 left-1/3 w-[350px] h-[350px] bg-indigo-600/10 dark:bg-indigo-600/15 rounded-full blur-[100px] pointer-events-none" />

        <motion.div
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
          className="max-w-5xl mx-auto text-center relative z-10"
        >
          <motion.h1
            variants={fadeInUp}
            className="font-outfit text-5xl md:text-7xl font-extrabold tracking-tight text-foreground mb-6 leading-tight"
          >
            Transform Tables Into <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-500 dark:from-blue-400 dark:via-indigo-400 dark:to-cyan-400">
              Interactive Ad Channels
            </span>
          </motion.h1>

          <motion.p
            variants={fadeInUp}
            className="max-w-2xl mx-auto text-lg text-muted-foreground mb-10 leading-relaxed"
          >
            DigiAds helps merchants earn device rental revenue by hosting smart tabletop kiosks, while advertisers book high-ROI campaigns directly inside local target venues.
          </motion.p>

          <motion.div
            variants={fadeInUp}
            className="flex flex-col sm:flex-row items-center justify-center gap-5"
          >
            <a
              href={`${userPortalUrl}/register?role=merchant`}
              className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 bg-primary text-primary-foreground font-bold px-8 py-4 rounded-2xl glow-hover transition-all shadow-xl hover:bg-primary/90 animate-none"
            >
              <span>Apply to Host (Merchants)</span>
              <ArrowRight className="w-5 h-5" />
            </a>
            <a
              href={`${userPortalUrl}/register?role=advertiser`}
              className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 bg-background border border-border text-foreground font-bold px-8 py-4 rounded-2xl hover:bg-muted transition-all shadow-xl"
            >
              <span>Book an Ad Campaign</span>
            </a>
          </motion.div>
        </motion.div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-20 px-6 bg-muted/20 relative border-y border-border">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="font-outfit text-3xl md:text-4xl font-bold text-foreground mb-4">
              All-In-One Hardware & Software Ecosystem
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Our custom Android firmware and responsive web tools make onboarding devices and serving targeted ads friction-free.
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="grid md:grid-cols-2 gap-8"
          >
            {features.map((feature, idx) => (
              <motion.div
                key={idx}
                variants={fadeInUp}
                whileHover={{ scale: 1.02 }}
                className="glassmorphism p-8 rounded-3xl flex flex-col md:flex-row items-start md:space-x-6 hover:border-primary/50 transition-all duration-300"
              >
                <div className="p-3 bg-background border border-border rounded-2xl mb-4 md:mb-0 shadow-inner">
                  {feature.icon}
                </div>
                <div>
                  <h3 className="font-outfit text-xl font-bold text-foreground mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Interactive Mockups Section */}
      <section id="demo" className="py-24 px-6 relative overflow-hidden">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="font-outfit text-3xl md:text-4xl font-bold text-foreground mb-4">
              Experience the Device Interfaces
            </h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              Toggle between the modes below to inspect our tabletop kiosk interfaces and large landscape display designs.
            </p>
          </motion.div>

          {/* Tab Controller */}
          <div className="flex justify-center mb-12">
            <div className="bg-muted border border-border p-1.5 rounded-2xl inline-flex space-x-2">
              <button
                onClick={() => setActiveTab('tablet')}
                className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all cursor-pointer ${activeTab === 'tablet'
                  ? 'bg-background text-foreground shadow-sm border border-border'
                  : 'text-muted-foreground hover:text-foreground'
                  }`}
              >
                <Tablet className="w-4 h-4" />
                <span>Tabletop Tablet</span>
              </button>
              <button
                onClick={() => setActiveTab('screen')}
                className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all cursor-pointer ${activeTab === 'screen'
                  ? 'bg-background text-foreground shadow-sm border border-border'
                  : 'text-muted-foreground hover:text-foreground'
                  }`}
              >
                <Tv className="w-4 h-4" />
                <span>Wall Display Screen</span>
              </button>
            </div>
          </div>

          {/* Two-Column Responsive Layout */}
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            {/* Left Column: Description (takes 5 columns on large screens) */}
            <div className="lg:col-span-5 text-left space-y-6">
              <AnimatePresence mode="wait">
                {activeTab === 'tablet' ? (
                  <motion.div
                    key="desc-tablet"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-6"
                  >
                    <span className="text-xs font-bold text-blue-500 uppercase tracking-widest bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20">
                      Tabletop Device
                    </span>
                    <h3 className="font-outfit text-3xl font-bold text-foreground">
                      Premium Tabletop Kiosk (Tablet)
                    </h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      Our vertical tablet kiosks sit elegantly on venue dining tables. When idle, they rotate vivid, high-resolution ads to engage patrons. On touch, they instantly launch a fluid, interactive food ordering and checkout interface powered by secure PhonePe gateways, providing a completely self-serve dining experience.
                    </p>
                    <ul className="space-y-3">
                      {[
                        "Vertical layout optimized for food menus",
                        "Idle state ad rotation loops for high visibility",
                        "One-tap digital menu access on customer touch",
                        "Timing-safe secure checkouts with PhonePe integration"
                      ].map((item, i) => (
                        <li key={i} className="flex items-start text-xs font-medium text-muted-foreground">
                          <CheckCircle2 className="w-4.5 h-4.5 text-blue-500 mr-2.5 shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                ) : (
                  <motion.div
                    key="desc-screen"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-6"
                  >
                    <span className="text-xs font-bold text-indigo-500 uppercase tracking-widest bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
                      Wall display
                    </span>
                    <h3 className="font-outfit text-3xl font-bold text-foreground">
                      Landscape Wall Display Screen
                    </h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      These wall-mounted display screens operate 24/7 to loop localized brand campaigns and advertising spot packages. Equipped with interactive QR codes for scanning, they capture telemetry details on scan events and impression durations to deliver robust ROI metrics for campaign advertisers.
                    </p>
                    <ul className="space-y-3">
                      {[
                        "Large 24/7 high-brightness landscape displays",
                        "Non-intrusive local advertising loops for maximum reach",
                        "Interactive QR code telemetry tracking on screen frames",
                        "Real-time viewer engagement and impression duration logs"
                      ].map((item, i) => (
                        <li key={i} className="flex items-start text-xs font-medium text-muted-foreground">
                          <CheckCircle2 className="w-4.5 h-4.5 text-indigo-500 mr-2.5 shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Right Column: Carousel Frame (takes 7 columns on large screens) */}
            <div className="lg:col-span-7 flex flex-col justify-center items-center relative">
              <AnimatePresence mode="wait">
                {activeTab === 'tablet' ? (
                  // Tablet Device Frame
                  <motion.div
                    key="carousel-tablet"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    className="relative w-full max-w-[400px] aspect-[3/4] bg-slate-900 rounded-3xl shadow-2xl overflow-hidden flex flex-col justify-between"
                  >
                    {/* Carousel Content */}
                    <div className="relative w-full h-full bg-black flex items-center justify-center">
                      <AnimatePresence mode="wait">
                        <motion.img
                          key={tabletIndex}
                          src={tabletImages[tabletIndex].src}
                          alt={`Tablet Slide ${tabletIndex}`}
                          className="w-full h-full object-contain select-none"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.3 }}
                        />
                      </AnimatePresence>

                      {/* Overlaid Controls */}
                      <button
                        onClick={prevTabletSlide}
                        className="absolute left-4 w-9 h-9 rounded-full bg-black/20 hover:bg-black/60 text-white/50 hover:text-white flex items-center justify-center cursor-pointer transition-all border border-white/5 opacity-25 hover:opacity-100"
                        aria-label="Previous Slide"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <button
                        onClick={nextTabletSlide}
                        className="absolute right-4 w-9 h-9 rounded-full bg-black/20 hover:bg-black/60 text-white/50 hover:text-white flex items-center justify-center cursor-pointer transition-all border border-white/5 opacity-25 hover:opacity-100"
                        aria-label="Next Slide"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Dot Indicators */}
                    <div className="absolute bottom-6 left-0 right-0 flex justify-center space-x-2 z-10">
                      {tabletImages.map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setTabletIndex(i)}
                          className={`w-2.5 h-2.5 rounded-full transition-all cursor-pointer ${tabletIndex === i ? 'bg-white scale-125' : 'bg-white/40'
                            }`}
                          aria-label={`Go to slide ${i + 1}`}
                        />
                      ))}
                    </div>
                  </motion.div>
                ) : (
                  // Screen Device Frame
                  <motion.div
                    key="carousel-screen"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    className="relative w-full max-w-[640px] aspect-[16/9] bg-slate-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col justify-between"
                  >
                    {/* Carousel Content */}
                    <div className="relative w-full h-full bg-black flex items-center justify-center">
                      <AnimatePresence mode="wait">
                        <motion.img
                          key={screenIndex}
                          src={screenImages[screenIndex].src}
                          alt={`Screen Slide ${screenIndex}`}
                          className="w-full h-full object-contain select-none"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.3 }}
                        />
                      </AnimatePresence>

                      {/* Overlaid Controls */}
                      <button
                        onClick={prevScreenSlide}
                        className="absolute left-4 w-9 h-9 rounded-full bg-black/20 hover:bg-black/60 text-white/50 hover:text-white flex items-center justify-center cursor-pointer transition-all border border-white/5 opacity-25 hover:opacity-100"
                        aria-label="Previous Slide"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <button
                        onClick={nextScreenSlide}
                        className="absolute right-4 w-9 h-9 rounded-full bg-black/20 hover:bg-black/60 text-white/50 hover:text-white flex items-center justify-center cursor-pointer transition-all border border-white/5 opacity-25 hover:opacity-100"
                        aria-label="Next Slide"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Dot Indicators */}
                    <div className="absolute bottom-6 left-0 right-0 flex justify-center space-x-2 z-10">
                      {screenImages.map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setScreenIndex(i)}
                          className={`w-2.5 h-2.5 rounded-full transition-all cursor-pointer ${screenIndex === i ? 'bg-white scale-125' : 'bg-white/40'
                            }`}
                          aria-label={`Go to slide ${i + 1}`}
                        />
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </section>

      {/* About Us Section */}
      <section id="about" className="py-20 px-6 bg-muted/10 relative border-t border-border overflow-hidden">
        {/* Glow effect */}
        <div className="absolute -right-40 top-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-12 gap-12 items-center">
            {/* Logo side */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="md:col-span-5 flex justify-center"
            >
              <div className="relative group p-8 bg-background/50 dark:bg-card/30 backdrop-blur-md rounded-3xl border border-border/80 shadow-2xl hover:border-blue-500/30 transition-all duration-500 max-w-[320px] w-full aspect-square flex items-center justify-center">
                <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/10 to-indigo-500/10 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <img
                  src={imgAibotLogo.src}
                  alt="Aibot Ink Logo"
                  className="w-full h-full object-contain max-h-[160px] filter drop-shadow-[0_8px_24px_rgba(59,130,246,0.15)] group-hover:scale-105 transition-transform duration-500 select-none"
                />
              </div>
            </motion.div>

            {/* Content side */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="md:col-span-7 space-y-6 text-left"
            >
              <div className="space-y-2">
                <span className="text-xs font-bold text-blue-500 uppercase tracking-widest bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20">
                  About Us
                </span>
                <h2 className="font-outfit text-3xl md:text-4xl font-extrabold tracking-tight text-foreground leading-tight">
                  Driving Innovation <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-indigo-500">
                    To Serve Society
                  </span>
                </h2>
              </div>
              <div className="space-y-4 text-sm md:text-base text-muted-foreground leading-relaxed font-outfit">
                <p>
                  Aibot Ink is a fast growing innovative start-up company formed by the team of veterans and scientists who are passionate, visionary and deep-rooted with the heart to serve the society by means of technology. We believe that technology is not only for big giants and multinational companies, but it has to be available, accessible and affordable to every individual in the society.
                </p>
                <p>
                  We research, innovate, develop and manufacture the most advanced, reliable and helpful technology solutions in the field of Aviation, Automation, Health and Alternate energy resources and applications.
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-sm text-muted-foreground">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <UtensilsCrossed className="w-4 h-4 text-white" />
            </div>
            <span className="font-outfit font-bold text-foreground">DigiAds</span>
          </div>

          <p className="text-center md:text-left">
            &copy; 2026 DigiAds Platform. All rights reserved.
          </p>

          <div className="flex space-x-6">
            <a href="#" className="hover:text-foreground transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-foreground transition-colors">Terms of Service</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
