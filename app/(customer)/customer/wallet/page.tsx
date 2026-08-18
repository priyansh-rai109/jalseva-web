'use client'

import React, { useState, useEffect } from 'react'
import {
  Coins, Gift, Share2, Copy, Check, ArrowUpRight,
  Droplets, Sparkles, TrendingUp, History, ShieldCheck, HeartHandshake
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { formatCurrency, formatDateTime, getReferralCode } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function CustomerWalletPage() {
  const { language } = useLanguage()
  const supabase = createClient()

  const [user, setUser] = useState<any>(null)
  const [copied, setCopied] = useState(false)
  const [walletBalance, setWalletBalance] = useState(150) // Default welcome balance

  useEffect(() => {
    supabase.auth.getUser().then((res: any) => {
      if (res?.data?.user) setUser(res.data.user)
    })
  }, [])

  const phoneOrId = user?.phone || user?.user_metadata?.phone || user?.id || '9166'
  const referralCode = getReferralCode(phoneOrId)
  const referralLink = `https://jalseva-web.vercel.app/register?ref=${referralCode}`

  const copyToClipboard = () => {
    navigator.clipboard.writeText(referralCode)
    setCopied(true)
    toast.success('🎉 Referral Code Copied!')
    setTimeout(() => setCopied(false), 2500)
  }

  const shareViaWhatsApp = () => {
    const text = encodeURIComponent(
      `💧 *JalSeva (जलसेवा) - शुद्ध पेयजल ऑफर!*\n\n` +
      `मेरे रेफरल कोड *${referralCode}* का उपयोग करके JalSeva पर पहले 20L वाटर कैन ऑर्डर पर ₹50 की छूट पाएं!\n\n` +
      `👉 अभी ऑर्डर करें: ${referralLink}`
    )
    window.open(`https://wa.me/?text=${text}`, '_blank')
  }

  const transactions = [
    {
      id: 'tx_1',
      type: 'credit',
      title: language === 'hi' ? 'स्वागत बोनस (Welcome Bonus)' : 'Welcome Bonus',
      amount: 100,
      date: new Date(Date.now() - 86400000 * 5).toISOString(),
      note: 'Account creation reward',
    },
    {
      id: 'tx_2',
      type: 'credit',
      title: language === 'hi' ? 'सफल रेफरल (Referral Reward)' : 'Referral Reward',
      amount: 50,
      date: new Date(Date.now() - 86400000 * 2).toISOString(),
      note: 'Friend placed their first water order',
    },
  ]

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-4xl mx-auto select-none">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
          <Coins className="w-7 h-7 text-amber-400" />
          <span>{language === 'hi' ? 'जलड्रॉप रिवॉर्ड वॉलेट (JalDrop Wallet)' : 'JalDrop Coins & Rewards'}</span>
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
          {language === 'hi'
            ? '1 JalDrop Coin = ₹1 छूट। दोस्तों को रेफर करें और हर ऑर्डर पर कॉइन्स कमाएं।'
            : '1 JalDrop Coin = ₹1 discount. Share with neighbors to earn 50 Coins per order.'}
        </p>
      </div>

      {/* Hero Wallet Card */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        {/* Balance Card */}
        <Card className="md:col-span-6 glass-card border-amber-500/40 bg-gradient-to-br from-amber-950/40 via-slate-900 to-slate-950 overflow-hidden shadow-2xl relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl" />
          <CardContent className="p-6 space-y-5">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider font-bold text-amber-400">YOUR BALANCE</span>
              <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-xs py-0.5">
                <Sparkles className="w-3 h-3 mr-1" /> 1 Coin = ₹1
              </Badge>
            </div>

            <div>
              <div className="text-4xl sm:text-5xl font-black font-mono text-amber-400 tracking-tight flex items-baseline gap-2">
                <span>{walletBalance}</span>
                <span className="text-sm font-semibold text-muted-foreground">Coins (₹{walletBalance})</span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                {language === 'hi' ? 'कार्ट चेकआउट पर तुरंत रिडीम किया जा सकता है' : 'Ready to redeem at cart checkout'}
              </p>
            </div>

            <div className="pt-2">
              <Link href="/customer/browse">
                <Button className="water-shimmer text-white text-xs font-semibold h-10 w-full rounded-xl gap-2 shadow-lg shadow-sky-500/20">
                  <Droplets className="w-4 h-4" />
                  <span>{language === 'hi' ? 'पानी ऑर्डर करें व कॉइन्स इस्तेमाल करें' : 'Order Water & Redeem Coins'}</span>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Share & Earn Card */}
        <Card className="md:col-span-6 glass-card border-sky-500/40 p-6 flex flex-col justify-between space-y-4 shadow-xl">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Gift className="w-5 h-5 text-sky-400" />
              <h3 className="font-bold text-base text-foreground">
                {language === 'hi' ? 'रेफर करें और ₹50 कमाएं' : 'Refer & Earn 50 Coins'}
              </h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {language === 'hi'
                ? 'अपने पड़ोसी या दोस्त को जलसेवा शेयर करें। उनके पहले 20L कैन ऑर्डर पर आपको ₹50 और उन्हें ₹50 छूट मिलेगी!'
                : 'Share pure water with friends. When they place their first order, you both earn 50 Coins!'}
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-secondary/80 border border-border px-3 py-2 rounded-xl text-xs font-mono font-bold text-center tracking-widest text-sky-300">
                {referralCode}
              </div>
              <Button size="sm" variant="outline" onClick={copyToClipboard} className="h-9 px-3 gap-1 text-xs">
                {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </Button>
            </div>

            <Button onClick={shareViaWhatsApp} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs h-10 gap-1.5 shadow-md">
              <Share2 className="w-3.5 h-3.5" />
              <span>{language === 'hi' ? 'WhatsApp पर रेफरल शेयर करें' : 'Share on WhatsApp'}</span>
            </Button>
          </div>
        </Card>
      </div>

      {/* Transaction History */}
      <Card className="glass-card">
        <CardHeader className="p-4 sm:p-5 border-b border-border">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <History className="w-4 h-4 text-sky-400" />
            <span>{language === 'hi' ? 'वॉलेट लेन-देन का इतिहास' : 'Wallet Transaction History'}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 divide-y divide-border">
          {transactions.map((tx) => (
            <div key={tx.id} className="p-4 flex items-center justify-between gap-4 text-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                  +
                </div>
                <div>
                  <div className="font-semibold text-foreground">{tx.title}</div>
                  <div className="text-muted-foreground text-[11px]">{tx.note} • {formatDateTime(tx.date)}</div>
                </div>
              </div>
              <div className="font-mono font-bold text-emerald-400 text-sm">
                +{tx.amount} Coins
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
