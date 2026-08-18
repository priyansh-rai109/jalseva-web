'use client'

import React, { useState } from 'react'
import {
  Calendar, RefreshCw, Plus, Pause, Play, Trash2, CheckCircle2,
  Clock, MapPin, Sparkles, Droplets, ShieldCheck, ChevronRight, AlertCircle
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { useSubscriptionStore, WaterSubscription } from '@/lib/stores/subscription-store'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'
import Link from 'next/link'

const PRESET_PLANS = [
  {
    planName: 'Family RO 20L Daily Pass',
    planNameHi: 'फैमिली RO 20L दैनिक पास',
    productType: 'can' as const,
    frequency: 'daily' as const,
    quantity: 1,
    pricePerDelivery: 35,
    monthlyTotal: 1050,
    deliveriesCount: 30,
    desc: 'Daily 1 fresh 20L can delivered every morning.',
    descHi: 'रोजाना सुबह 1 ताज़ा 20L शुद्ध RO कैन की डिलीवरी।',
    popular: true,
  },
  {
    planName: 'Alternate Days 20L Can Pass',
    planNameHi: 'एक दिन छोड़कर 20L कैन पास',
    productType: 'can' as const,
    frequency: 'alternate_days' as const,
    quantity: 1,
    pricePerDelivery: 35,
    monthlyTotal: 525,
    deliveriesCount: 15,
    desc: '1 Can delivered every 2 days. Perfect for small families.',
    descHi: 'हर 2 दिन में 1 कैन। छोटे परिवारों के लिए सर्वोत्तम।',
    popular: false,
  },
  {
    planName: 'Commercial Tanker 4,000L Weekly Refill',
    planNameHi: 'कमर्शियल टैंकर 4,000L साप्ताहिक रिफिल',
    productType: 'tanker' as const,
    frequency: 'weekly' as const,
    quantity: 1,
    pricePerDelivery: 600,
    monthlyTotal: 2400,
    deliveriesCount: 4,
    desc: '1 Full 4,000L tanker every weekend for societies & buildings.',
    descHi: 'सोसायटियों और भवनों के लिए हर हफ्ते 4,000L टैंकर।',
    popular: false,
  },
]

export default function SubscriptionsPage() {
  const { language } = useLanguage()
  const { subscriptions, createSubscription, toggleStatus, cancelSubscription } = useSubscriptionStore()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedPreset, setSelectedPreset] = useState(PRESET_PLANS[0])
  const [address, setAddress] = useState('14, Sardarpura B-Road, Jodhpur (342003)')
  const [timeSlot, setTimeSlot] = useState<'morning' | 'afternoon' | 'evening'>('morning')

  const handleCreate = () => {
    if (!address.trim()) {
      toast.error(language === 'hi' ? 'कृपया डिलीवरी पता भरें' : 'Please provide delivery address')
      return
    }

    createSubscription({
      planName: language === 'hi' ? selectedPreset.planNameHi : selectedPreset.planName,
      productType: selectedPreset.productType,
      frequency: selectedPreset.frequency,
      quantity: selectedPreset.quantity,
      pricePerDelivery: selectedPreset.pricePerDelivery,
      monthlyTotal: selectedPreset.monthlyTotal,
      deliveryTimeSlot: timeSlot,
      address,
      startDate: new Date().toISOString().split('T')[0],
      totalDeliveries: selectedPreset.deliveriesCount,
    })

    toast.success(language === 'hi' ? '🎉 नया मासिक वॉटर पास सक्रिय हो गया!' : '🎉 Monthly Water Pass Activated Successfully!')
    setShowCreateModal(false)
  }

  return (
    <div className="p-3 sm:p-5 md:p-8 space-y-6 max-w-5xl mx-auto pb-24 md:pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
            <RefreshCw className="w-6 h-6 text-sky-400" />
            <span>{language === 'hi' ? 'मासिक वॉटर पास व सब्सक्रिप्शन' : 'Monthly Water Pass & Subscriptions'}</span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            {language === 'hi'
              ? 'बिना रोज़ ऑर्डर किए ऑटोमैटिक शुद्ध पानी की नियमित डिलीवरी पाएं।'
              : 'Automated hassle-free regular water delivery for your home and workplace.'}
          </p>
        </div>

        <Button
          onClick={() => setShowCreateModal(true)}
          className="water-shimmer text-white font-semibold text-xs sm:text-sm min-h-[42px] rounded-xl shadow-lg shadow-sky-500/20"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          {language === 'hi' ? '+ नया मासिक पास शुरू करें' : '+ Start New Monthly Pass'}
        </Button>
      </div>

      {/* Active Subscriptions List */}
      {subscriptions.length === 0 ? (
        <Card className="glass-card text-center p-8 sm:p-12 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center mx-auto text-sky-400">
            <Droplets className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-foreground">
              {language === 'hi' ? 'कोई सक्रिय मासिक पास नहीं है' : 'No Active Monthly Passes'}
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto">
              {language === 'hi'
                ? 'रोज़ाना पानी की चिंता छोड़ें! 1-क्लिक में 30-दिन का शुद्ध पानी का पास शुरू करें।'
                : 'Say goodbye to daily ordering! Start a 30-day recurring pure RO water pass with 1 click.'}
            </p>
          </div>
          <Button onClick={() => setShowCreateModal(true)} className="water-shimmer text-white text-xs font-semibold">
            {language === 'hi' ? 'प्लान्स देखें और पास बनाएं' : 'Browse Plans & Start Pass'}
          </Button>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
          {subscriptions.map((sub) => {
            const isActive = sub.status === 'active'
            const percent = Math.min(100, Math.round((sub.deliveriesCompleted / sub.totalDeliveries) * 100))

            return (
              <Card
                key={sub.id}
                className={`glass-card relative overflow-hidden transition-all ${
                  isActive ? 'border-sky-500/50 shadow-lg shadow-sky-500/10' : 'border-border/60 opacity-80'
                }`}
              >
                <div className={`h-2 w-full ${isActive ? 'bg-gradient-to-r from-sky-400 to-blue-600' : 'bg-muted'}`} />
                <CardHeader className="p-4 sm:p-5 pb-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                        <span>{sub.productType === 'can' ? '🫙' : '🚛'}</span>
                        <span>{sub.planName}</span>
                      </CardTitle>
                      <CardDescription className="text-xs mt-0.5">
                        {sub.frequency === 'daily'
                          ? (language === 'hi' ? 'प्रतिदिन डिलीवरी' : 'Daily Delivery')
                          : sub.frequency === 'alternate_days'
                          ? (language === 'hi' ? 'हर दूसरे दिन' : 'Alternate Days')
                          : (language === 'hi' ? 'साप्ताहिक' : 'Weekly')} • {sub.deliveryTimeSlot.toUpperCase()}
                      </CardDescription>
                    </div>

                    <Badge
                      className={
                        isActive
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-xs'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/30 text-xs'
                      }
                    >
                      {isActive ? (language === 'hi' ? '✓ सक्रिय' : '✓ Active') : (language === 'hi' ? '⏸️ रुका हुआ' : '⏸️ Paused')}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="p-4 sm:p-5 space-y-4">
                  {/* Progress Bar */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{language === 'hi' ? 'डिलीवरी प्रगति' : 'Delivery Progress'}</span>
                      <span className="font-bold text-foreground">
                        {sub.deliveriesCompleted} / {sub.totalDeliveries} {language === 'hi' ? 'पूरी हुई' : 'completed'} ({percent}%)
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-secondary overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-sky-400 to-blue-500 transition-all duration-500"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>

                  {/* Next Delivery details */}
                  <div className="p-3 rounded-xl bg-secondary/60 border border-border/80 text-xs space-y-2">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-sky-400" />
                        {language === 'hi' ? 'अगली डिलीवरी' : 'Next Delivery'}:
                      </span>
                      <strong className="text-foreground">{sub.nextDeliveryDate}</strong>
                    </div>

                    <div className="flex items-center justify-between text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-sky-400" />
                        {language === 'hi' ? 'समय स्लॉट' : 'Time Slot'}:
                      </span>
                      <strong className="text-foreground capitalize">{sub.deliveryTimeSlot} (7-9 AM)</strong>
                    </div>

                    <div className="flex items-center justify-between text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-sky-400" />
                        {language === 'hi' ? 'पता' : 'Address'}:
                      </span>
                      <strong className="text-foreground truncate max-w-[200px]">{sub.address}</strong>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <div className="text-sm font-bold gradient-text" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                      {formatCurrency(sub.monthlyTotal)} / {language === 'hi' ? 'माह' : 'month'}
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          toggleStatus(sub.id)
                          toast.info(isActive ? 'Subscription paused' : 'Subscription resumed')
                        }}
                        className="text-xs h-8 px-2.5"
                      >
                        {isActive ? (
                          <>
                            <Pause className="w-3.5 h-3.5 mr-1 text-amber-400" />
                            {language === 'hi' ? 'रोकें (Pause)' : 'Pause'}
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5 mr-1 text-emerald-400" />
                            {language === 'hi' ? 'शुरू करें (Resume)' : 'Resume'}
                          </>
                        )}
                      </Button>

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          cancelSubscription(sub.id)
                          toast.success('Subscription cancelled')
                        }}
                        className="text-xs h-8 px-2 text-muted-foreground hover:text-red-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-slate-900 border border-sky-500/30 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="text-center space-y-1">
              <h2 className="text-xl sm:text-2xl font-bold text-foreground" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                {language === 'hi' ? '💧 नया मासिक वॉटर पास चुनें' : '💧 Select Monthly Water Pass'}
              </h2>
              <p className="text-xs text-muted-foreground">
                {language === 'hi' ? 'जोधपुर में शुद्ध RO पानी की नियमित दैनिक डिलीवरी' : 'Guaranteed fresh RO water delivery across Jodhpur'}
              </p>
            </div>

            {/* Plan selection cards */}
            <div className="space-y-3">
              {PRESET_PLANS.map((plan) => {
                const isSel = selectedPreset.planName === plan.planName
                return (
                  <div
                    key={plan.planName}
                    onClick={() => setSelectedPreset(plan)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                      isSel
                        ? 'border-sky-500 bg-sky-500/10 shadow-lg shadow-sky-500/10'
                        : 'border-border bg-secondary/50 hover:border-sky-500/30'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-foreground">
                            {language === 'hi' ? plan.planNameHi : plan.planName}
                          </span>
                          {plan.popular && (
                            <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-[10px] py-0 px-1.5">
                              ⭐ Popular
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {language === 'hi' ? plan.descHi : plan.desc}
                        </p>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <div className="text-base font-bold gradient-text" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                          {formatCurrency(plan.monthlyTotal)}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          ({plan.deliveriesCount} {language === 'hi' ? 'डिलीवरी' : 'deliveries'})
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Time Slot Selection */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold">{language === 'hi' ? 'पसंदीदा समय स्लॉट' : 'Preferred Delivery Slot'}</Label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'morning', label: '7 - 9 AM', icon: '🌅' },
                  { value: 'afternoon', label: '1 - 3 PM', icon: '☀️' },
                  { value: 'evening', label: '6 - 8 PM', icon: '🌆' },
                ].map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setTimeSlot(s.value as any)}
                    className={`p-2.5 rounded-xl border text-center text-xs transition-all ${
                      timeSlot === s.value
                        ? 'border-sky-500 bg-sky-500/10 font-bold text-sky-300'
                        : 'border-border bg-secondary text-muted-foreground'
                    }`}
                  >
                    <div>{s.icon} {s.value.toUpperCase()}</div>
                    <div className="text-[10px] opacity-80 mt-0.5">{s.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Delivery Address */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold">{language === 'hi' ? 'डिलीवरी का पता' : 'Delivery Address'}</Label>
              <Input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Street address, Colony, Jodhpur"
                className="bg-secondary h-10 text-xs"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setShowCreateModal(false)}
                className="flex-1 text-xs min-h-[40px] rounded-xl"
              >
                {language === 'hi' ? 'रद्द करें' : 'Cancel'}
              </Button>
              <Button
                onClick={handleCreate}
                className="flex-1 water-shimmer text-white font-semibold text-xs min-h-[40px] rounded-xl shadow-lg shadow-sky-500/20"
              >
                {language === 'hi' ? '🎉 पास सक्रिय करें' : '🎉 Activate Pass'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
