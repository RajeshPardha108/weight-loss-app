"use client";

import Link from "next/link";
import styles from "./page.module.css";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";

function LogMenuContent() {
  const searchParams = useSearchParams();
  const dateParam = searchParams?.get("date");
  
  // Pass date forward if we are coming from the Journal
  const querySuffix = dateParam ? `?date=${dateParam}` : "";

  return (
    <div className={styles.container}>
      <div className={styles.mobileView}>
        <div className={styles.header}>
          <h1 className={styles.title}>What to log?</h1>
          <div className={styles.subtitle}>{dateParam ? `For ${dateParam}` : "For today"}</div>
        </div>

        <div className={styles.menuList}>
          <Link href={`/log/weight${querySuffix}`} className={styles.menuItem}>
            <div className={styles.iconWrapper}>⚖️</div>
            <div className={styles.textWrapper}>
              <h3 className={styles.itemTitle}>Weight</h3>
              <p className={styles.itemDesc}>Before/after toilet measurements</p>
            </div>
            <div className={styles.chevron}>›</div>
          </Link>

          <Link href={`/log/food${querySuffix}`} className={styles.menuItem}>
            <div className={styles.iconWrapper}>🍽️</div>
            <div className={styles.textWrapper}>
              <h3 className={styles.itemTitle}>Food</h3>
              <p className={styles.itemDesc}>Clean or cheat meal</p>
            </div>
            <div className={styles.chevron}>›</div>
          </Link>

          <Link href={`/log/water${querySuffix}`} className={styles.menuItem}>
            <div className={styles.iconWrapper}>💧</div>
            <div className={styles.textWrapper}>
              <h3 className={styles.itemTitle}>Water</h3>
              <p className={styles.itemDesc}>Total hydration in liters</p>
            </div>
            <div className={styles.chevron}>›</div>
          </Link>

          <Link href={`/log/mood${querySuffix}`} className={styles.menuItem}>
            <div className={styles.iconWrapper}>🙂</div>
            <div className={styles.textWrapper}>
              <h3 className={styles.itemTitle}>Mood</h3>
              <p className={styles.itemDesc}>How you felt</p>
            </div>
            <div className={styles.chevron}>›</div>
          </Link>

          <Link href={`/log/steps${querySuffix}`} className={styles.menuItem}>
            <div className={styles.iconWrapper}>👟</div>
            <div className={styles.textWrapper}>
              <h3 className={styles.itemTitle}>Steps</h3>
              <p className={styles.itemDesc}>Total daily steps</p>
            </div>
            <div className={styles.chevron}>›</div>
          </Link>

          <Link href={`/measurements${querySuffix}`} className={styles.menuItem}>
            <div className={styles.iconWrapper}>📏</div>
            <div className={styles.textWrapper}>
              <h3 className={styles.itemTitle}>Body Measurements</h3>
              <p className={styles.itemDesc}>Occasional tape measurements</p>
            </div>
            <div className={styles.chevron}>›</div>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LogMenu() {
  return (
    <Suspense fallback={<div className={styles.container}><div className={styles.mobileView}><div className={styles.header}>Loading...</div></div></div>}>
      <LogMenuContent />
    </Suspense>
  );
}
