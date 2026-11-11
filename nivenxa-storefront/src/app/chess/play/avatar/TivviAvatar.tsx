'use client'
import { useEffect, useId, useRef } from 'react'
import type { AvatarState } from '@/lib/chess/avatarReaction'
import styles from './TivviAvatar.module.scss'

// Layered Tivvi (working name). Part classes are the animation hooks; elements marked `detail` are dropped below 64 px.
// TEST-ONLY ARTWORK: shipped in the client bundle only when NEXT_PUBLIC_CHESS_AVATAR_PROTOTYPE=1. Not approved for deployment.

interface Props {
  state: AvatarState
  /** Rendered diameter in px. Below 64 the face is small: fine details are hidden and only blinking moves. */
  size: number
  /** User wants motion AND the OS does not ask for reduced motion. */
  animate: boolean
  /** Accessible name; the caption beside it carries the same information as text. */
  label: string
}

const rnd = (a: number, b: number) => a + Math.random() * (b - a)

export default function TivviAvatar({ state, size, animate, label }: Props) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  const root = useRef<SVGSVGElement>(null)
  const small = size < 64
  const idShade = `tvsh${uid}`
  const idL = `tvcl${uid}`
  const idR = `tvcr${uid}`

  // Off-screen / hidden tab: nothing runs. Bursts are short one-shot class toggles, so pausing = not scheduling more.
  const active = useRef(false)
  useEffect(() => {
    const el = root.current
    if (!el) return
    let inView = true
    let visible = !document.hidden
    const set = () => {
      active.current = animate && inView && visible
    }
    set()
    const io = new IntersectionObserver((e) => {
      inView = e[0]?.isIntersecting ?? true
      set()
    })
    io.observe(el)
    const onVis = () => {
      visible = !document.hidden
      set()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      io.disconnect()
      document.removeEventListener('visibilitychange', onVis)
      active.current = false
    }
  }, [animate])

  useEffect(() => {
    const el = root.current
    if (!el || !animate) return
    let timer: ReturnType<typeof setTimeout>
    const fx = (nodes: Element[], cls: string, ms: number) =>
      nodes.forEach((n) => {
        n.classList.add(cls)
        setTimeout(() => n.classList.remove(cls), ms)
      })
    const burst = () => {
      if (active.current) {
        fx([...el.querySelectorAll('[data-part=eye]')], styles.blinking, 260)
        if (!small) {
          const s = el.dataset.state
          if (s === 'idle') {
            const r = Math.random()
            if (r < 0.3) fx([el.querySelector(Math.random() < 0.5 ? '[data-part=earL]' : '[data-part=earR]')!], styles.flicking, 900)
            else if (r < 0.5) fx([el.querySelector('[data-part=scarfEnd]')!], styles.swaying, 2000)
          }
        }
      }
      timer = setTimeout(burst, rnd(2200, 5200))
    }
    timer = setTimeout(burst, rnd(1200, 3000))
    return () => clearTimeout(timer)
  }, [animate, small])

  return (
    <svg
      ref={root}
      className={styles.av}
      viewBox="0 0 1024 1024"
      role="img"
      aria-label={label}
      data-state={state}
      data-anim={animate ? 'on' : 'off'}
      data-min={small ? 'true' : 'false'}
      data-testid="tivvi-avatar"
    >
      <defs>
        <radialGradient id={idShade} cx="38%" cy="30%" r="80%">
          <stop offset="0" stopColor="#fff" stopOpacity=".16" />
          <stop offset=".6" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#7a3a00" stopOpacity=".28" />
        </radialGradient>
        <clipPath id={idL}><ellipse cx="428" cy="478" rx="36" ry="46" /></clipPath>
        <clipPath id={idR}><ellipse cx="596" cy="478" rx="36" ry="46" /></clipPath>
      </defs>
      <g stroke="#2B1B47" strokeWidth="8" strokeLinejoin="round" strokeLinecap="round">
        <path d="M120 1024 C140 860 300 780 512 780 C724 780 884 860 904 1024 Z" fill="#E08E2B" />
        <g className={styles.head} data-part="head">
          <g className={`${styles.ear} ${styles.earL}`} data-part="earL"><circle cx="272" cy="335" r="122" fill="#F2A93B" /><circle cx="272" cy="335" r="74" fill="#F9CF8E" stroke="none" /></g>
          <g className={`${styles.ear} ${styles.earR}`} data-part="earR"><circle cx="752" cy="335" r="122" fill="#F2A93B" /><circle cx="752" cy="335" r="74" fill="#F9CF8E" stroke="none" /></g>
          <ellipse cx="512" cy="500" rx="258" ry="236" fill="#F2A93B" />
          <ellipse cx="512" cy="500" rx="258" ry="236" fill={`url(#${idShade})`} stroke="none" />
          <ellipse cx="512" cy="595" rx="132" ry="92" fill="#FBD596" stroke="none" />
          <circle cx="350" cy="575" r="38" fill="#EE7468" opacity=".5" stroke="none" />
          <circle cx="674" cy="575" r="38" fill="#EE7468" opacity=".5" stroke="none" />
          <path className={`${styles.brow} ${styles.browL}`} d="M384 420 Q428 394 472 420" fill="none" strokeWidth="21" />
          <path className={`${styles.brow} ${styles.browR}`} d="M552 420 Q596 394 640 420" fill="none" strokeWidth="21" />
          <g className={styles.eyes}>
            <g className={`${styles.eye} ${styles.eyeL}`} data-part="eye"><ellipse cx="428" cy="478" rx="36" ry="46" fill="#2B1B47" /><circle cx="416" cy="462" r="13" fill="#fff" stroke="none" /><g clipPath={`url(#${idL})`}><rect className={styles.lid} x="380" y="424" width="96" height="46" fill="#F2A93B" stroke="none" /></g></g>
            <g className={`${styles.eye} ${styles.eyeR}`} data-part="eye"><ellipse cx="596" cy="478" rx="36" ry="46" fill="#2B1B47" /><circle cx="584" cy="462" r="13" fill="#fff" stroke="none" /><g clipPath={`url(#${idR})`}><rect className={styles.lid} x="548" y="424" width="96" height="46" fill="#F2A93B" stroke="none" /></g></g>
          </g>
          <ellipse cx="512" cy="548" rx="22" ry="15" fill="#2B1B47" />
          <path className={`${styles.m} ${styles.mSmile}`} d="M470 606 Q512 650 554 606" fill="none" strokeWidth="15" />
          <path className={`${styles.m} ${styles.mWarm}`} d="M446 596 Q512 676 578 596" fill="none" strokeWidth="16" />
          <path className={`${styles.m} ${styles.mGrin}`} d="M456 600 Q512 612 568 600 Q556 668 512 670 Q468 668 456 600 Z" fill="#6B1F3A" />
          <path className={`${styles.m} ${styles.mFlat}`} d="M484 626 Q512 632 540 626" fill="none" strokeWidth="16" />
          <path className={`${styles.m} ${styles.mConcern}`} d="M476 638 Q512 612 548 638" fill="none" strokeWidth="16" />
        </g>
        <path d="M286 762 Q512 846 738 762 L756 852 Q512 936 268 852 Z" fill="#6B2D7B" />
        <path className={styles.scarfEnd} data-part="scarfEnd" d="M598 868 L700 852 L722 990 L636 976 Z" fill="#7C3A8D" />
        {!small && (
          <>
            <path d="M330 800 Q512 862 694 800" fill="none" stroke="#B67DC6" strokeWidth="6" />
            <circle cx="512" cy="833" r="15" fill="#E8B75E" strokeWidth="5" />
            <path d="M499 868 L505 845 L519 845 L525 868 Z" fill="#E8B75E" strokeWidth="5" />
            <rect x="493" y="866" width="38" height="9" rx="3" fill="#E8B75E" strokeWidth="5" />
          </>
        )}
      </g>
    </svg>
  )
}
