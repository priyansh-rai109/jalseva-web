'use client'

import Link from 'next/link'
import {
  Droplets,
  Truck,
  Shield,
  Star,
  ChevronRight,
  Phone,
  MapPin,
  Clock,
  CheckCircle2,
  Waves,
  Building2,
  Users,
  Package,
  ArrowRight,
  Share2,
  MessageCircle,
  Globe,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { LanguageToggle } from '@/components/shared/LanguageToggle'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { WaterConservationTicker } from '@/components/animation/WaterConservationTicker'
import { Water3DOrbHero } from '@/components/animation/Water3DOrbHero'

// ─── Navbar ────────────────────────────────────────────────────────────────
function Navbar() {
  const { t } = useLanguage()

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 backdrop-blur-xl bg-background/80">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 sm:gap-2.5 group">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl water-shimmer flex items-center justify-center shadow-lg shadow-sky-500/20 group-hover:scale-110 transition-transform duration-300">
              <Droplets className="w-4 h-4 sm:w-5 sm:h-5 text-white animate-pulse" />
            </div>
            <span className="text-lg sm:text-xl font-bold" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
              <span className="gradient-text">Jal</span>
              <span className="text-foreground">Seva</span>
            </span>
          </Link>

          {/* Nav Links */}
          <div className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#how-it-works" className="hover:text-foreground transition-colors">{t('howItWorks')}</a>
            <a href="#products" className="hover:text-foreground transition-colors">{t('waterProducts')}</a>
            <a href="#suppliers" className="hover:text-foreground transition-colors">{t('customerStories')}</a>
            <Link href="/corporate" className="text-sky-400 font-semibold hover:text-sky-300 transition-colors flex items-center gap-1">
              <span>B2B Corporate 🏢</span>
            </Link>
          </div>

          {/* Language Toggle & CTAs */}
          <div className="flex items-center gap-2 sm:gap-3">
            <LanguageToggle variant="compact" />
            <Link href="/login">
              <Button variant="ghost" size="sm" className="text-xs sm:text-sm px-2.5 sm:px-3 text-muted-foreground hover:text-foreground">
                {t('signIn')}
              </Button>
            </Link>
            <Link href="/register">
              <Button size="sm" className="water-shimmer text-white text-xs sm:text-sm font-medium px-3 sm:px-4">
                {t('orderWaterButton')}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )
}

// ─── Hero ───────────────────────────────────────────────────────────────────
function Hero() {
  const { t } = useLanguage()

  return (
    <section className="relative min-h-screen flex items-center pt-16 overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-sky-500/8 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-cyan-400/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-900/10 rounded-full blur-3xl" />
      </div>

      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <div className="max-w-4xl mx-auto text-center">
          <Badge className="mb-4 sm:mb-6 bg-sky-500/10 text-sky-400 border-sky-500/20 px-3 sm:px-4 py-1 text-xs">
            <MapPin className="w-3 h-3 mr-1.5" /> {t('heroServingBadge')}
          </Badge>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-bold leading-tight mb-4 sm:mb-6"
            style={{ fontFamily: 'Rajdhani, sans-serif' }}>
            <span className="text-foreground">{t('heroTitle1')}</span>
            <br />
            <span className="gradient-text">{t('heroTitle2')}</span>
          </h1>

          <p className="text-base sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-6 sm:mb-8 leading-relaxed">
            {t('heroSubtitle')}
          </p>

          {/* Interactive 3D Water Orb Hero Animation */}
          <Water3DOrbHero />

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
            <Link href="/register" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto water-shimmer text-white font-semibold px-8 h-12 text-base group glow-blue">
                {t('orderWaterNow')}
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link href="/register?role=supplier" className="w-full sm:w-auto">
              <Button size="lg" variant="outline" className="w-full sm:w-auto border-border/50 text-foreground px-8 h-12 text-base hover:border-amber-500/50 hover:text-amber-400 transition-all">
                <Building2 className="w-4 h-4 mr-2" />
                {t('becomeSupplier')}
              </Button>
            </Link>
          </div>

          {/* Trust badges */}
          <div className="mt-8 sm:mt-12 flex flex-wrap justify-center gap-4 sm:gap-6 text-xs sm:text-sm text-muted-foreground">
            {[t('trustVerified'), t('trustTracking'), t('trustCod')].map((item) => (
              <div key={item} className="flex items-center gap-1.5 sm:gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-sky-400 flex-shrink-0" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Stats ──────────────────────────────────────────────────────────────────
function Stats() {
  const { language } = useLanguage()

  const statsData = [
    { value: '50+', label: language === 'hi' ? 'सत्यापित सप्लायर्स' : 'Verified Suppliers', icon: Building2 },
    { value: '5,000+', label: language === 'hi' ? 'संतुष्ट ग्राहक' : 'Happy Customers', icon: Users },
    { value: '20,000+', label: language === 'hi' ? 'सफल डिलीवरी' : 'Orders Delivered', icon: Package },
    { value: '4.8★', label: language === 'hi' ? 'औसत रेटिंग' : 'Average Rating', icon: Star },
  ]

  return (
    <section className="py-10 sm:py-16 border-y border-border/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-8">
          {statsData.map((stat) => (
            <div key={stat.label} className="text-center group">
              <stat.icon className="w-5 h-5 sm:w-6 sm:h-6 text-sky-400 mx-auto mb-2 sm:mb-3 group-hover:scale-110 transition-transform" />
              <div className="text-2xl sm:text-3xl font-bold gradient-text mb-1" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                {stat.value}
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Features ───────────────────────────────────────────────────────────────
function Features() {
  const { t, language } = useLanguage()

  const featuresList = [
    {
      icon: Shield,
      title: language === 'hi' ? 'सत्यापित सप्लायर्स' : 'Verified Suppliers',
      desc: language === 'hi' ? 'प्रत्येक पानी सप्लायर हमारी टीम द्वारा अच्छी तरह जांचा और स्वीकृत किया जाता है।' : 'Every water supplier is vetted and approved by our team before listing.',
      color: 'text-sky-400',
      bg: 'bg-sky-400/10',
    },
    {
      icon: Truck,
      title: language === 'hi' ? 'तेज़ व समय पर डिलीवरी' : 'Fast Delivery',
      desc: language === 'hi' ? 'आपके द्वार तक सीधे — उसी दिन, तय समय पर सुरक्षित पानी की डिलीवरी।' : 'Get water delivered to your doorstep — same day, every time.',
      color: 'text-cyan-400',
      bg: 'bg-cyan-400/10',
    },
    {
      icon: Clock,
      title: language === 'hi' ? 'लाइव ट्रैकिंग' : 'Real-Time Tracking',
      desc: language === 'hi' ? 'ऑर्डर की पुष्टि से लेकर डिलीवरी तक अपने पानी के वाहन को ट्रैक करें।' : 'Track your order from confirmation to delivery, live.',
      color: 'text-amber-400',
      bg: 'bg-amber-400/10',
    },
    {
      icon: Star,
      title: language === 'hi' ? 'सच्ची रेटिंग और समीक्षाएं' : 'Rated & Reviewed',
      desc: language === 'hi' ? 'असली ग्राहकों की रेटिंग और समीक्षाओं के आधार पर बेहतरीन सप्लायर चुनें।' : 'Choose suppliers based on real customer ratings and reviews.',
      color: 'text-purple-400',
      bg: 'bg-purple-400/10',
    },
  ]

  return (
    <section id="features" className="py-12 sm:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10 sm:mb-16">
          <Badge className="mb-3 sm:mb-4 bg-sky-500/10 text-sky-400 border-sky-500/20 text-xs">{t('whyJalSeva')}</Badge>
          <h2 className="text-2xl sm:text-4xl font-bold mb-2 sm:mb-4" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
            {language === 'hi' ? 'जोधपुर की पानी की ज़रूरतों के लिए निर्मित' : "Built for Jodhpur's Water Needs"}
          </h2>
          <p className="text-muted-foreground text-xs sm:text-base max-w-2xl mx-auto">
            {language === 'hi'
              ? 'हम राजस्थान में पानी की अहमियत समझते हैं। जलसेवा आपके पानी के ऑर्डर को आसान, पारदर्शी और तनावमुक्त बनाती है।'
              : 'We understand the unique water challenges of Rajasthan. JalSeva makes water delivery reliable, transparent, and hassle-free.'}
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {featuresList.map((feature) => (
            <div key={feature.title} className="glass-card p-5 sm:p-6 group hover:border-sky-500/30 transition-all duration-300 hover:-translate-y-1">
              <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl ${feature.bg} flex items-center justify-center mb-3 sm:mb-4 group-hover:scale-110 transition-transform`}>
                <feature.icon className={`w-5 h-5 sm:w-6 sm:h-6 ${feature.color}`} />
              </div>
              <h3 className="font-semibold text-foreground text-sm sm:text-base mb-1 sm:mb-2">{feature.title}</h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── How It Works ───────────────────────────────────────────────────────────
function HowItWorks() {
  const { t, language } = useLanguage()

  const stepsList = [
    {
      step: '01',
      title: language === 'hi' ? 'सप्लायर चुनें' : 'Browse Suppliers',
      desc: language === 'hi' ? 'जोधपुर में अपने पिनकोड के अनुसार वेरिफाइड सप्लायर खोजें।' : 'Find verified water suppliers near your pincode in Jodhpur.',
      icon: MapPin
    },
    {
      step: '02',
      title: language === 'hi' ? 'उत्पाद चुनें और ऑर्डर करें' : 'Place Your Order',
      desc: language === 'hi' ? 'टैंकर, 20L कैन या आरओ पाउच चुनें और डिलीवरी का पता दर्ज करें।' : 'Select tanker, 20L cans, or RO pouches and confirm your order.',
      icon: Package
    },
    {
      step: '03',
      title: language === 'hi' ? 'घर बैठे पानी पाएं' : 'Get It Delivered',
      desc: language === 'hi' ? 'सप्लायर ऑर्डर कन्फर्म करके आपके द्वार तक पानी पहुंचाता है।' : 'Supplier confirms and delivers water to your doorstep.',
      icon: Truck
    },
  ]

  return (
    <section id="how-it-works" className="py-12 sm:py-20 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-sky-500/3 to-transparent" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="text-center mb-10 sm:mb-16">
          <Badge className="mb-3 sm:mb-4 bg-sky-500/10 text-sky-400 border-sky-500/20 text-xs">{t('howItWorks')}</Badge>
          <h2 className="text-2xl sm:text-4xl font-bold mb-2 sm:mb-4" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
            {language === 'hi' ? 'केवल 3 आसान स्टेप्स में पानी पाएं' : 'Order Water in 3 Steps'}
          </h2>
          <p className="text-muted-foreground text-xs sm:text-sm">
            {language === 'hi' ? 'ब्राउज से लेकर डिलीवरी तक — बेहद आसान और तेज।' : 'From browse to delivery — fast and simple.'}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 sm:gap-8 relative">
          <div className="hidden md:block absolute top-12 left-1/3 right-1/3 h-0.5 bg-gradient-to-r from-sky-500/30 via-sky-500/60 to-sky-500/30" />

          {stepsList.map((step, i) => (
            <div key={step.step} className="relative text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 rounded-2xl glass-card border-sky-500/20 mb-4 sm:mb-6 relative group hover:border-sky-500/50 transition-all duration-300">
                <span className="absolute -top-2 -right-2 sm:-top-3 sm:-right-3 w-6 h-6 sm:w-7 sm:h-7 rounded-full water-shimmer text-white text-xs font-bold flex items-center justify-center">
                  {i + 1}
                </span>
                <step.icon className="w-8 h-8 sm:w-10 sm:h-10 text-sky-400 group-hover:scale-110 transition-transform" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold mb-1 sm:mb-2" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                {step.title}
              </h3>
              <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Product Types ───────────────────────────────────────────────────────────
function ProductTypes() {
  const { t, language } = useLanguage()

  const productTypesList = [
    {
      name: t('tanker'),
      desc: t('tankerDesc'),
      capacity: '5,000 – 10,000 L',
      price: language === 'hi' ? '₹800 से' : 'From ₹800',
      icon: '🚛',
      color: 'from-sky-600/20 to-blue-600/20',
      border: 'border-sky-500/20',
    },
    {
      name: t('can'),
      desc: t('canDesc'),
      capacity: '20 L',
      price: language === 'hi' ? '₹30 से' : 'From ₹30',
      icon: '🫙',
      color: 'from-cyan-600/20 to-teal-600/20',
      border: 'border-cyan-500/20',
    },
    {
      name: t('pouch'),
      desc: t('pouchDesc'),
      capacity: '100 Pcs (250ml)',
      price: language === 'hi' ? '₹120 से' : 'From ₹120',
      icon: '💧',
      color: 'from-teal-600/20 to-emerald-600/20',
      border: 'border-teal-500/20',
    },
  ]

  return (
    <section id="products" className="py-12 sm:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10 sm:mb-16">
          <Badge className="mb-3 sm:mb-4 bg-sky-500/10 text-sky-400 border-sky-500/20 text-xs">{t('waterProducts')}</Badge>
          <h2 className="text-2xl sm:text-4xl font-bold mb-2 sm:mb-4" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
            {language === 'hi' ? 'आपकी हर ज़रूरत के लिए शुद्ध जल' : 'Every Water Need, Covered'}
          </h2>
          <p className="text-muted-foreground text-xs sm:text-sm">
            {language === 'hi' ? 'बड़े टैंकर से लेकर 20L कैन और पाउच तक — सब कुछ उपलब्ध।' : 'From bulk tankers to everyday cans — we have it all.'}
          </p>
        </div>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
          {productTypesList.map((product) => (
            <div
              key={product.name}
              className={`relative p-5 sm:p-6 rounded-2xl border ${product.border} bg-gradient-to-br ${product.color} hover:scale-105 transition-all duration-300 cursor-pointer group`}
            >
              <div className="text-4xl sm:text-5xl mb-3 sm:mb-4 group-hover:animate-float">{product.icon}</div>
              <h3 className="text-lg sm:text-xl font-bold mb-1 sm:mb-2" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                {product.name}
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">{product.desc}</p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground bg-white/5 px-2.5 sm:px-3 py-1 rounded-full">{product.capacity}</span>
                <span className="font-semibold text-sm sm:text-base text-sky-400">{product.price}</span>
              </div>
              <Link href="/register" className="mt-3 sm:mt-4 flex items-center gap-1 text-xs sm:text-sm text-sky-400 group-hover:gap-2 transition-all">
                {t('orderWaterNow')} <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Testimonials ────────────────────────────────────────────────────────────
function Testimonials() {
  const { t, language } = useLanguage()

  const testimonialsList = [
    {
      name: 'Priya Sharma',
      location: 'Sardarpura, Jodhpur',
      rating: 5,
      text: language === 'hi' ? 'जलसेवा से पानी मंगवाना बहुत ही सुविधाजनक हो गया है! मैं हर हफ्ते 20L कैन मंगवाती हूँ और सप्लायर समय पर पहुंचता है।' : 'JalSeva has made water delivery so convenient! I order 20L cans every week and the supplier is always on time.',
    },
    {
      name: 'Rajesh Mehta',
      location: 'Ratanada, Jodhpur',
      rating: 5,
      text: language === 'hi' ? 'शानदार सर्विस! मैंने घर के काम के लिए टैंकर मंगाया था और 2 घंटे के अंदर डिलीवर हो गया।' : 'Excellent service. Ordered a tanker for my new house construction and it was delivered within 2 hours.',
    },
    {
      name: 'Sunita Bishnoi',
      location: 'Paota, Jodhpur',
      rating: 5,
      text: language === 'hi' ? 'इस्तेमाल करने में बहुत आसान है। मैं लाइव देख सकती हूँ कि पानी कब पहुंचेगा।' : 'Very easy to use. I can track when the supplier will arrive. Highly recommend to everyone in Jodhpur.',
    },
  ]

  return (
    <section id="suppliers" className="py-12 sm:py-20 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-sky-500/3 to-transparent" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="text-center mb-10 sm:mb-16">
          <Badge className="mb-3 sm:mb-4 bg-sky-500/10 text-sky-400 border-sky-500/20 text-xs">{t('customerStories')}</Badge>
          <h2 className="text-2xl sm:text-4xl font-bold mb-2 sm:mb-4" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
            {language === 'hi' ? 'जोधपुर निवासियों का अटूट विश्वास' : 'Trusted by Jodhpur Residents'}
          </h2>
        </div>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
          {testimonialsList.map((tItem) => (
            <div key={tItem.name} className="glass-card p-5 sm:p-6 hover:border-sky-500/30 transition-all duration-300">
              <div className="flex mb-3 sm:mb-4">
                {Array.from({ length: tItem.rating }).map((_, i) => (
                  <Star key={i} className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400 fill-amber-400" />
                ))}
              </div>
              <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed mb-3 sm:mb-4">&quot;{tItem.text}&quot;</p>
              <div className="flex items-center gap-3 pt-3 sm:pt-4 border-t border-border/50">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full water-shimmer flex items-center justify-center text-white text-xs sm:text-sm font-bold">
                  {tItem.name[0]}
                </div>
                <div>
                  <div className="text-xs sm:text-sm font-medium">{tItem.name}</div>
                  <div className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> {tItem.location}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── CTA ─────────────────────────────────────────────────────────────────────
function CTA() {
  const { t } = useLanguage()

  return (
    <section className="py-12 sm:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden">
          <div className="absolute inset-0 water-shimmer opacity-20" />
          <div className="absolute inset-0 bg-gradient-to-r from-sky-900/90 to-blue-900/90" />
          <div className="absolute inset-0 border border-sky-500/30 rounded-2xl sm:rounded-3xl" />

          <div className="relative p-6 sm:p-12 md:p-20 text-center">
            <Waves className="w-10 h-10 sm:w-12 sm:h-12 text-sky-300 mx-auto mb-4 sm:mb-6 animate-float" />
            <h2 className="text-2xl sm:text-4xl md:text-5xl font-bold text-white mb-2 sm:mb-4" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
              {t('readyForWater')}
            </h2>
            <p className="text-sky-200 text-sm sm:text-lg mb-6 sm:mb-10 max-w-2xl mx-auto">
              {t('readySubtitle')}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
              <Link href="/register" className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto bg-white text-sky-900 hover:bg-sky-50 font-bold px-8 sm:px-10 h-12 sm:h-13 text-sm sm:text-base">
                  <Droplets className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                  {t('startOrdering')}
                </Button>
              </Link>
              <Link href="/register?role=supplier" className="w-full sm:w-auto">
                <Button size="lg" variant="outline" className="w-full sm:w-auto border-white/30 text-white hover:bg-white/10 px-8 sm:px-10 h-12 sm:h-13 text-sm sm:text-base">
                  <Building2 className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                  {t('becomeSupplier')}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Footer ──────────────────────────────────────────────────────────────────
function Footer() {
  const { language } = useLanguage()

  return (
    <footer className="border-t border-border/50 py-10 sm:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div className="md:col-span-2">
            <Link href="/" className="inline-flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg water-shimmer flex items-center justify-center">
                <Droplets className="w-4 h-4 text-white" />
              </div>
              <span className="text-xl font-bold" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                <span className="gradient-text">Jal</span>
                <span className="text-foreground">Seva</span>
              </span>
            </Link>
            <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
              {language === 'hi'
                ? 'जोधपुर का पहला विश्वसनीय जल वितरण मार्केटप्लेस। 2024 से सप्लायर्स और ग्राहकों को सीधे जोड़ रहा है।'
                : "Jodhpur's trusted water delivery marketplace. Connecting suppliers and customers since 2024."}
            </p>
            <div className="flex items-center gap-1 mt-3 text-xs text-muted-foreground">
              <Phone className="w-3 h-3" />
              <span>+91 98765 43210</span>
            </div>
            <div className="flex items-center gap-3 mt-4">
              {[Share2, MessageCircle, Globe].map((Icon, i) => (
                <a key={i} href="#" className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-sky-400 hover:bg-sky-500/10 transition-all">
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-semibold text-sm mb-4">{language === 'hi' ? 'प्लेटफॉर्म' : 'Platform'}</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {[
                { label: language === 'hi' ? 'सप्लायर्स देखें' : 'Browse Suppliers', href: '/login' },
                { label: language === 'hi' ? 'पानी ऑर्डर करें' : 'Order Water', href: '/login' },
                { label: language === 'hi' ? 'ऑर्डर ट्रैक करें' : 'Track Order', href: '/login' },
                { label: language === 'hi' ? 'सप्लायर बनें' : 'Become Supplier', href: '/register?role=supplier' },
              ].map((item) => (
                <li key={item.label}>
                  <Link href={item.href} className="hover:text-foreground transition-colors">{item.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-4">{language === 'hi' ? 'कंपनी' : 'Company'}</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {[
                { label: language === 'hi' ? 'हमारे बारे में' : 'About Us', href: '#' },
                { label: language === 'hi' ? 'संपर्क करें' : 'Contact', href: '#' },
                { label: language === 'hi' ? 'गोपनीयता नीति' : 'Privacy Policy', href: '#' },
                { label: language === 'hi' ? 'सेवा की शर्तें' : 'Terms of Service', href: '#' },
              ].map((item) => (
                <li key={item.label}>
                  <a href={item.href} className="hover:text-foreground transition-colors">{item.label}</a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-border/50 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <span>© 2024 JalSeva. {language === 'hi' ? 'जोधपुर के लिए 💧 के साथ निर्मित।' : 'Made with 💧 for Jodhpur.'}</span>
          <Link href="/admin-login" className="hover:text-muted-foreground/70 underline underline-offset-2">
            Admin / Operator Login
          </Link>
        </div>
      </div>
    </footer>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  return (
    <main className="bg-background">
      <Navbar />
      <Hero />
      <div className="max-w-4xl mx-auto px-4 -mt-6 sm:-mt-8 relative z-20">
        <WaterConservationTicker />
      </div>
      <Stats />
      <Features />
      <HowItWorks />
      <ProductTypes />
      <Testimonials />
      <CTA />
      <Footer />
    </main>
  )
}
