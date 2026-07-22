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

// ─── Data ──────────────────────────────────────────────────────────────────
const features = [
  {
    icon: Shield,
    title: 'Verified Suppliers',
    desc: 'Every water supplier is vetted and approved by our team before listing.',
    color: 'text-sky-400',
    bg: 'bg-sky-400/10',
  },
  {
    icon: Truck,
    title: 'Fast Delivery',
    desc: 'Get water delivered to your doorstep — same day, every time.',
    color: 'text-cyan-400',
    bg: 'bg-cyan-400/10',
  },
  {
    icon: Clock,
    title: 'Real-Time Tracking',
    desc: 'Track your order from confirmation to delivery, live.',
    color: 'text-amber-400',
    bg: 'bg-amber-400/10',
  },
  {
    icon: Star,
    title: 'Rated & Reviewed',
    desc: 'Choose suppliers based on real customer ratings and reviews.',
    color: 'text-purple-400',
    bg: 'bg-purple-400/10',
  },
]

const steps = [
  { step: '01', title: 'Browse Suppliers', desc: 'Find verified water suppliers near your pincode in Jodhpur.', icon: MapPin },
  { step: '02', title: 'Place Your Order', desc: 'Select tanker, 20L cans, or RO pouches and confirm your order.', icon: Package },
  { step: '03', title: 'Get It Delivered', desc: 'Supplier confirms and delivers water to your doorstep.', icon: Truck },
]

const productTypes = [
  {
    name: 'Water Tanker',
    desc: 'Bulk water for homes, events & construction',
    capacity: '5,000 – 10,000 L',
    price: 'From ₹800',
    icon: '🚛',
    color: 'from-sky-600/20 to-blue-600/20',
    border: 'border-sky-500/20',
  },
  {
    name: '20L Water Can',
    desc: 'RO purified water cans for daily use',
    capacity: '20 Liters',
    price: 'From ₹30',
    icon: '🫙',
    color: 'from-cyan-600/20 to-teal-600/20',
    border: 'border-cyan-500/20',
  },
  {
    name: 'RO Pouch',
    desc: 'Hygienic sealed pouches for drinking water',
    capacity: '200 ml – 1 L',
    price: 'From ₹2',
    icon: '💧',
    color: 'from-teal-600/20 to-emerald-600/20',
    border: 'border-teal-500/20',
  },
]

const testimonials = [
  {
    name: 'Priya Sharma',
    location: 'Sardarpura, Jodhpur',
    rating: 5,
    text: 'JalSeva has made water delivery so convenient! I order 20L cans every week and the supplier is always on time.',
  },
  {
    name: 'Rajesh Mehta',
    location: 'Ratanada, Jodhpur',
    rating: 5,
    text: 'Excellent service. Ordered a tanker for my new house construction and it was delivered within 2 hours.',
  },
  {
    name: 'Sunita Bishnoi',
    location: 'Paota, Jodhpur',
    rating: 4,
    text: 'Very easy to use. I can track when the supplier will arrive. Highly recommend to everyone in Jodhpur.',
  },
]

const stats = [
  { value: '50+', label: 'Verified Suppliers', icon: Building2 },
  { value: '5,000+', label: 'Happy Customers', icon: Users },
  { value: '20,000+', label: 'Orders Delivered', icon: Package },
  { value: '4.8★', label: 'Average Rating', icon: Star },
]

// ─── Navbar ────────────────────────────────────────────────────────────────
function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 backdrop-blur-xl bg-background/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg water-shimmer flex items-center justify-center">
              <Droplets className="w-4 h-4 text-white" />
            </div>
            <span className="text-xl font-bold" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
              <span className="gradient-text">Jal</span>
              <span className="text-foreground">Seva</span>
            </span>
          </Link>

          {/* Nav Links */}
          <div className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#how-it-works" className="hover:text-foreground transition-colors">How it Works</a>
            <a href="#products" className="hover:text-foreground transition-colors">Products</a>
            <a href="#suppliers" className="hover:text-foreground transition-colors">Suppliers</a>
          </div>

          {/* CTAs */}
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                Sign In
              </Button>
            </Link>
            <Link href="/register">
              <Button size="sm" className="water-shimmer text-white font-medium">
                Order Water
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

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="max-w-4xl mx-auto text-center">
          <Badge className="mb-6 bg-sky-500/10 text-sky-400 border-sky-500/20 px-4 py-1.5">
            <MapPin className="w-3 h-3 mr-1.5" /> Serving Jodhpur, Rajasthan
          </Badge>

          <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold leading-tight mb-6"
            style={{ fontFamily: 'Rajdhani, sans-serif' }}>
            <span className="text-foreground">Pure Water,</span>
            <br />
            <span className="gradient-text">Delivered Fast</span>
          </h1>

          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            Jodhpur&apos;s first water delivery marketplace. Order tankers, 20L cans, and RO pouches from
            verified suppliers — tracked in real time, delivered to your door.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register">
              <Button size="lg" className="water-shimmer text-white font-semibold px-8 h-12 text-base group glow-blue">
                Order Water Now
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link href="/register?role=supplier">
              <Button size="lg" variant="outline" className="border-border/50 text-foreground px-8 h-12 text-base hover:border-amber-500/50 hover:text-amber-400 transition-all">
                <Building2 className="w-4 h-4 mr-2" />
                List as Supplier
              </Button>
            </Link>
          </div>

          {/* Trust badges */}
          <div className="mt-12 flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
            {['Admin Verified Suppliers', 'Real-Time Tracking', 'Cash on Delivery'].map((item) => (
              <div key={item} className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-sky-400 flex-shrink-0" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Wave bottom */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
          <path d="M0,40 C360,80 1080,0 1440,40 L1440,80 L0,80 Z" fill="rgba(14,165,233,0.03)" />
        </svg>
      </div>
    </section>
  )
}

// ─── Stats ──────────────────────────────────────────────────────────────────
function Stats() {
  return (
    <section className="py-16 border-y border-border/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center group">
              <stat.icon className="w-6 h-6 text-sky-400 mx-auto mb-3 group-hover:scale-110 transition-transform" />
              <div className="text-3xl font-bold gradient-text mb-1" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                {stat.value}
              </div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Features ───────────────────────────────────────────────────────────────
function Features() {
  return (
    <section id="features" className="py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <Badge className="mb-4 bg-sky-500/10 text-sky-400 border-sky-500/20">Why JalSeva?</Badge>
          <h2 className="text-4xl font-bold mb-4" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
            Built for Jodhpur&apos;s Water Needs
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            We understand the unique water challenges of Rajasthan. JalSeva makes water delivery reliable, transparent, and hassle-free.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature) => (
            <div key={feature.title} className="glass-card p-6 group hover:border-sky-500/30 transition-all duration-300 hover:-translate-y-1">
              <div className={`w-12 h-12 rounded-xl ${feature.bg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <feature.icon className={`w-6 h-6 ${feature.color}`} />
              </div>
              <h3 className="font-semibold text-foreground mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── How It Works ───────────────────────────────────────────────────────────
function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-sky-500/3 to-transparent" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="text-center mb-16">
          <Badge className="mb-4 bg-sky-500/10 text-sky-400 border-sky-500/20">Simple Process</Badge>
          <h2 className="text-4xl font-bold mb-4" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
            Order Water in 3 Steps
          </h2>
          <p className="text-muted-foreground">From browse to delivery — fast and simple.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 relative">
          {/* Connector line */}
          <div className="hidden md:block absolute top-12 left-1/3 right-1/3 h-0.5 bg-gradient-to-r from-sky-500/30 via-sky-500/60 to-sky-500/30" />

          {steps.map((step, i) => (
            <div key={step.step} className="relative text-center">
              <div className="inline-flex items-center justify-center w-24 h-24 rounded-2xl glass-card border-sky-500/20 mb-6 relative group hover:border-sky-500/50 transition-all duration-300">
                <span className="absolute -top-3 -right-3 w-7 h-7 rounded-full water-shimmer text-white text-xs font-bold flex items-center justify-center">
                  {i + 1}
                </span>
                <step.icon className="w-10 h-10 text-sky-400 group-hover:scale-110 transition-transform" />
              </div>
              <h3 className="text-xl font-semibold mb-2" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                {step.title}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Product Types ───────────────────────────────────────────────────────────
function ProductTypes() {
  return (
    <section id="products" className="py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <Badge className="mb-4 bg-sky-500/10 text-sky-400 border-sky-500/20">Water Products</Badge>
          <h2 className="text-4xl font-bold mb-4" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
            Every Water Need, Covered
          </h2>
          <p className="text-muted-foreground">From bulk tankers to everyday cans — we have it all.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {productTypes.map((product) => (
            <div
              key={product.name}
              className={`relative p-6 rounded-2xl border ${product.border} bg-gradient-to-br ${product.color} hover:scale-105 transition-all duration-300 cursor-pointer group`}
            >
              <div className="text-5xl mb-4 group-hover:animate-float">{product.icon}</div>
              <h3 className="text-xl font-bold mb-2" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                {product.name}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">{product.desc}</p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground bg-white/5 px-3 py-1 rounded-full">{product.capacity}</span>
                <span className="font-semibold text-sky-400">{product.price}</span>
              </div>
              <Link href="/register" className="mt-4 flex items-center gap-1 text-sm text-sky-400 group-hover:gap-2 transition-all">
                Order Now <ChevronRight className="w-4 h-4" />
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
  return (
    <section id="suppliers" className="py-24 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-sky-500/3 to-transparent" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="text-center mb-16">
          <Badge className="mb-4 bg-sky-500/10 text-sky-400 border-sky-500/20">Customer Stories</Badge>
          <h2 className="text-4xl font-bold mb-4" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
            Trusted by Jodhpur Residents
          </h2>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((t) => (
            <div key={t.name} className="glass-card p-6 hover:border-sky-500/30 transition-all duration-300">
              <div className="flex mb-4">
                {Array.from({ length: t.rating }).map((_, i) => (
                  <Star key={i} className="w-4 h-4 text-amber-400 fill-amber-400" />
                ))}
              </div>
              <p className="text-muted-foreground text-sm leading-relaxed mb-4">&quot;{t.text}&quot;</p>
              <div className="flex items-center gap-3 pt-4 border-t border-border/50">
                <div className="w-9 h-9 rounded-full water-shimmer flex items-center justify-center text-white text-sm font-bold">
                  {t.name[0]}
                </div>
                <div>
                  <div className="text-sm font-medium">{t.name}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> {t.location}
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
  return (
    <section className="py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-3xl overflow-hidden">
          <div className="absolute inset-0 water-shimmer opacity-20" />
          <div className="absolute inset-0 bg-gradient-to-r from-sky-900/90 to-blue-900/90" />
          <div className="absolute inset-0 border border-sky-500/30 rounded-3xl" />

          <div className="relative p-12 md:p-20 text-center">
            <Waves className="w-12 h-12 text-sky-300 mx-auto mb-6 animate-float" />
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
              Ready for Pure Water Delivery?
            </h2>
            <p className="text-sky-200 text-lg mb-10 max-w-2xl mx-auto">
              Join thousands of Jodhpur residents who trust JalSeva for their daily water needs.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/register">
                <Button size="lg" className="bg-white text-sky-900 hover:bg-sky-50 font-bold px-10 h-13 text-base">
                  <Droplets className="w-5 h-5 mr-2" />
                  Start Ordering
                </Button>
              </Link>
              <Link href="/register?role=supplier">
                <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10 px-10 h-13 text-base">
                  <Building2 className="w-5 h-5 mr-2" />
                  Become a Supplier
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
  return (
    <footer className="border-t border-border/50 py-12">
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
              Jodhpur&apos;s trusted water delivery marketplace. Connecting suppliers and customers since 2024.
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
            <h4 className="font-semibold text-sm mb-4">Platform</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {['Browse Suppliers', 'Order Water', 'Track Order', 'Become Supplier'].map((item) => (
                <li key={item}>
                  <Link href="/login" className="hover:text-foreground transition-colors">{item}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-4">Company</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {['About Us', 'Contact', 'Privacy Policy', 'Terms of Service'].map((item) => (
                <li key={item}>
                  <a href="#" className="hover:text-foreground transition-colors">{item}</a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-border/50 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <span>© 2024 JalSeva. All rights reserved. Made with 💧 for Jodhpur.</span>
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
