'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import {
  Building2, Truck, ShieldCheck, FileText, CheckCircle2,
  Droplets, Phone, ArrowRight, Sparkles, Clock, Calendar,
  MessageSquare, Users, HelpCircle, MapPin, Send, Loader2
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { useLanguage } from '@/lib/i18n/LanguageContext'

export default function CorporatePortalPage() {
  const { language } = useLanguage()

  const [companyName, setCompanyName] = useState('')
  const [contactName, setContactName] = useState('')
  const [phone, setPhone] = useState('')
  const [gstin, setGstin] = useState('')
  const [siteAddress, setSiteAddress] = useState('')
  const [category, setCategory] = useState<'hotel' | 'hostel' | 'construction' | 'hospital' | 'office'>('hotel')
  const [capacity, setCapacity] = useState<'5000L' | '10000L' | '20000L' | 'can_contract'>('5000L')
  const [frequency, setFrequency] = useState<'daily' | 'alternate' | 'weekly' | 'on_demand'>('daily')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!phone || phone.length < 10) {
      toast.error('Kripya apna 10-digit mobile number darj karein')
      return
    }

    setSubmitting(true)
    setTimeout(() => {
      setSubmitting(false)
      setSubmitted(true)
      toast.success('🎉 Corporate Contract Request Received! Our key account manager will call within 15 minutes.')
    }, 1000)
  }

  const handleWhatsAppInquiry = () => {
    const text = encodeURIComponent(
      `🏢 *JalSeva B2B Corporate Inquiry*\n` +
      `🏢 Company: ${companyName || 'Corporate Client'}\n` +
      `👤 Contact: ${contactName} (${phone})\n` +
      `💧 Requirement: ${capacity} (${category.toUpperCase()})\n` +
      `🔄 Schedule: ${frequency.toUpperCase()}\n` +
      `📍 Site: ${siteAddress || 'Jodhpur'}\n` +
      `📄 GSTIN: ${gstin || 'N/A'}`
    )
    window.open(`https://wa.me/919166759989?text=${text}`, '_blank')
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <nav className="sticky top-0 z-40 bg-card/90 backdrop-blur-md border-b border-border py-3.5 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg water-shimmer flex items-center justify-center text-white">
              <Droplets className="w-4 h-4" />
            </div>
            <span className="text-xl font-bold" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
              <span className="gradient-text">Jal</span>
              <span>Seva</span>
              <span className="text-xs bg-sky-500/10 text-sky-400 border border-sky-500/20 px-2 py-0.5 rounded-full ml-2">
                B2B Corporate
              </span>
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm" className="text-xs sm:text-sm">Sign In</Button>
            </Link>
            <Link href="/register">
              <Button size="sm" className="water-shimmer text-white text-xs sm:text-sm">Register</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative py-12 sm:py-20 px-4 sm:px-8 overflow-hidden bg-gradient-to-b from-sky-950/30 via-background to-background">
        <div className="max-w-5xl mx-auto text-center space-y-4">
          <Badge className="bg-sky-500/10 text-sky-400 border-sky-500/20 px-3 py-1 text-xs">
            <Building2 className="w-3.5 h-3.5 mr-1.5" />
            {language === 'hi' ? 'होटल, हॉस्टल, अस्पताल व निर्माण साइट्स के लिए' : 'For Hotels, Hostels, Hospitals & Sites'}
          </Badge>

          <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold leading-tight" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
            <span>{language === 'hi' ? 'थोक जल टैंकर व कॉर्पोरेट अनुबंध' : 'Commercial Water Tankers & B2B Supply'}</span>
            <br />
            <span className="gradient-text">
              {language === 'hi' ? 'जीएसटी इनवॉइस व निश्चित डिलीवरी गारंटी' : 'Guaranteed Daily Supply with GST Billing'}
            </span>
          </h1>

          <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            {language === 'hi'
              ? 'जोधपुर भर में 5,000L से 20,000L टैंकर और 20L कैन्स के दैनिक बल्क कॉन्ट्रैक्ट। मासिक बिलिंग, समर्पित खाता प्रबंधक और लैब प्रमाणित शुद्धता।'
              : 'Reliable 5,000L to 20,000L tanker delivery and bulk 20L can supplies across Jodhpur. Dedicated account manager, automated schedules, and monthly invoicing.'}
          </p>
        </div>
      </section>

      {/* Main Content Form & Benefits */}
      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Form */}
        <div className="lg:col-span-7">
          <Card className="glass-card border-sky-500/30 shadow-2xl overflow-hidden">
            <CardHeader className="bg-muted/40 border-b border-border">
              <CardTitle className="text-lg sm:text-xl font-bold flex items-center gap-2">
                <FileText className="w-5 h-5 text-sky-400" />
                <span>{language === 'hi' ? 'कॉर्पोरेट अनुबंध व कोटेशन फॉर्म' : 'Request Corporate Quote / Contract'}</span>
              </CardTitle>
            </CardHeader>

            <CardContent className="p-5 sm:p-6">
              {submitted ? (
                <div className="text-center py-8 space-y-4">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center animate-bounce">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                    {language === 'hi' ? 'कोटेशन अनुरोध सफलतापूर्वक प्राप्त हुआ!' : 'Request Received Successfully!'}
                  </h3>
                  <p className="text-xs text-muted-foreground max-w-md mx-auto">
                    {language === 'hi'
                      ? `धन्यवाद ${contactName || companyName}! हमारे B2B अकाउंट मैनेजर 15 मिनट के भीतर आपसे (${phone}) संपर्क करेंगे और सबसे किफायती दर उपलब्ध कराएंगे।`
                      : `Thank you ${contactName || companyName}! Our dedicated B2B manager will contact you at ${phone} within 15 minutes.`}
                  </p>
                  <div className="pt-4 flex justify-center gap-3">
                    <Button onClick={handleWhatsAppInquiry} className="water-shimmer text-white text-xs gap-1.5">
                      <MessageSquare className="w-4 h-4" />
                      <span>WhatsApp पर तुरंत चैट करें</span>
                    </Button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                  {/* Category Selector */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Business Category</Label>
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                      {[
                        { id: 'hotel', label: 'Hotel & Cafe' },
                        { id: 'hostel', label: 'Hostel / PG' },
                        { id: 'construction', label: 'Site / Builders' },
                        { id: 'hospital', label: 'Hospital' },
                        { id: 'office', label: 'Office' },
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setCategory(item.id as any)}
                          className={`p-2 rounded-xl text-center border font-medium transition-all ${
                            category === item.id
                              ? 'border-sky-400 bg-sky-500/20 text-sky-300 shadow-sm'
                              : 'border-border bg-secondary/50 text-muted-foreground hover:bg-secondary'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Volume Selection */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Required Volume</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { id: '5000L', label: '5,000L Tanker', desc: 'Standard RO' },
                        { id: '10000L', label: '10,000L Tanker', desc: 'Commercial' },
                        { id: '20000L', label: '20,000L Tanker', desc: 'Heavy Plant' },
                        { id: 'can_contract', label: 'Daily 20L Cans', desc: '10-100 Cans/Day' },
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setCapacity(item.id as any)}
                          className={`p-2.5 rounded-xl text-left border transition-all ${
                            capacity === item.id
                              ? 'border-sky-400 bg-sky-500/20 text-sky-300'
                              : 'border-border bg-secondary/50 text-muted-foreground hover:bg-secondary'
                          }`}
                        >
                          <div className="font-bold text-foreground">{item.label}</div>
                          <div className="text-[10px] text-muted-foreground">{item.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Frequency */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Delivery Frequency</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { id: 'daily', label: 'Daily Supply' },
                        { id: 'alternate', label: 'Alternate Days' },
                        { id: 'weekly', label: 'Weekly Schedule' },
                        { id: 'on_demand', label: 'On-Demand / Emergency' },
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setFrequency(item.id as any)}
                          className={`p-2 rounded-xl text-center border text-xs font-medium transition-all ${
                            frequency === item.id
                              ? 'border-sky-400 bg-sky-500/20 text-sky-300'
                              : 'border-border bg-secondary/50 text-muted-foreground'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Inputs */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className="space-y-1">
                      <Label className="text-xs">Company / Enterprise Name</Label>
                      <Input
                        required
                        placeholder="e.g. Grand Heritage Hotel"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        className="bg-secondary"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">GSTIN (Optional)</Label>
                      <Input
                        placeholder="e.g. 08AAAAA0000A1Z5"
                        value={gstin}
                        onChange={(e) => setGstin(e.target.value.toUpperCase())}
                        className="bg-secondary font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Contact Person Name</Label>
                      <Input
                        required
                        placeholder="e.g. Vikram Sharma"
                        value={contactName}
                        onChange={(e) => setContactName(e.target.value)}
                        className="bg-secondary"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Contact Mobile Number</Label>
                      <Input
                        required
                        type="tel"
                        maxLength={10}
                        placeholder="e.g. 9829012345"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                        className="bg-secondary font-mono"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Delivery Site / Location Address (Jodhpur)</Label>
                    <Input
                      required
                      placeholder="e.g. Near Paota Circle, Mandore Road, Jodhpur"
                      value={siteAddress}
                      onChange={(e) => setSiteAddress(e.target.value)}
                      className="bg-secondary"
                    />
                  </div>

                  <div className="pt-2">
                    <Button
                      type="submit"
                      disabled={submitting}
                      className="w-full water-shimmer text-white font-bold h-11 text-sm gap-2 shadow-lg shadow-sky-500/25"
                    >
                      {submitting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                      <span>{language === 'hi' ? 'कोटेशन प्राप्त करें (Get Free Quote)' : 'Get Free Corporate Quote'}</span>
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Benefits */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="glass-card p-5 space-y-4 border-sky-500/20">
            <h3 className="text-base font-bold text-foreground flex items-center gap-2" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>JalSeva Enterprise Guarantee</span>
            </h3>

            <div className="space-y-3 text-xs text-muted-foreground">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div>
                  <strong className="text-foreground block">100% On-Time Tanker Delivery</strong>
                  GPS-monitored high-capacity tankers ensure your hotel or site never faces water downtime.
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div>
                  <strong className="text-foreground block">GST Tax Invoicing & Monthly Credits</strong>
                  Single monthly consolidated GST bill with standard 15-day or 30-day payment terms for verified corporates.
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div>
                  <strong className="text-foreground block">TDS & Hygiene Certified</strong>
                  Every batch is laboratory tested for TDS 80-120 ppm, zero heavy metals, and food-grade safety.
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div>
                  <strong className="text-foreground block">24x7 Priority Support</strong>
                  Dedicated B2B helpline and emergency priority tanker dispatch within 45 minutes.
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-foreground">Need Urgent Tanker Today?</div>
                <div className="text-[11px] text-muted-foreground">Instant hotline for Jodhpur bulk supplies</div>
              </div>
              <a href="tel:+919166759989">
                <Button size="sm" className="water-shimmer text-white text-xs h-8">
                  <Phone className="w-3 h-3 mr-1" /> Call Now
                </Button>
              </a>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
