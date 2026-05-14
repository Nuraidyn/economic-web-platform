import React, { useCallback, useContext } from "react";
import { useNavigate } from "react-router-dom";

import CTAFinal from "../components/landing/CTAFinal";
import FeaturesGrid from "../components/landing/FeaturesGrid";
import HeroSection from "../components/landing/HeroSection";
import HowItWorks from "../components/landing/HowItWorks";
import NewsSection from "../components/landing/NewsSection";
import TrustStrip from "../components/landing/TrustStrip";
import AuthContext from "../context/AuthContext";
import { useI18n } from "../context/I18nContext";
import { useUI } from "../context/UIContext";

export default function Home() {
  const { t } = useI18n();
  const { user } = useContext(AuthContext);
  const { openAuthModal } = useUI();
  const navigate = useNavigate();

  const goToAnalysis = useCallback(() => {
    navigate("/compare");
  }, [navigate]);

  const handleAuthCTA = useCallback(() => {
    if (user) {
      navigate("/compare");
    } else {
      openAuthModal();
    }
  }, [user, openAuthModal, navigate]);

  return (
    <>
      {/* ── 1. Hero ── */}
      <HeroSection onScrollToAnalysis={goToAnalysis} onOpenAuth={handleAuthCTA} />

      {/* ── 2. Trust Strip ── */}
      <TrustStrip />

      {/* ── 3. Features Grid ── */}
      <FeaturesGrid />

      {/* Section divider */}
      <div className="section-divider" aria-hidden="true" />

      {/* ── 4. How It Works ── */}
      <HowItWorks />

      {/* ── 5. News Feed ── */}
      <div className="section-divider" aria-hidden="true" />
      <div id="news">
        <NewsSection />
      </div>

      {/* ── 6. Closing CTA — unauthenticated only ── */}
      {!user && (
        <>
          <div className="section-divider" aria-hidden="true" />
          <CTAFinal onOpenAuth={handleAuthCTA} />
        </>
      )}
    </>
  );
}
