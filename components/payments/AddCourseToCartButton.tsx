"use client";

import Link from "next/link";
import { useState } from "react";

const CART_STORAGE_KEY = "asia-lms-cart";

export function AddCourseToCartButton({ courseId }: { courseId: string }) {
  const [added, setAdded] = useState(false);

  function addCourse() {
    let courseIds: string[] = [];
    try {
      const stored: unknown = JSON.parse(
        window.localStorage.getItem(CART_STORAGE_KEY) ?? "[]"
      );
      if (Array.isArray(stored)) {
        courseIds = stored.filter(
          (id): id is string => typeof id === "string"
        );
      }
    } catch {
      courseIds = [];
    }
    if (!courseIds.includes(courseId)) courseIds.push(courseId);
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(courseIds));
    setAdded(true);
  }

  return (
    <div className="enrollment-action">
      <button
        className="button button-primary purchase-button"
        onClick={addCourse}
        type="button"
      >
        {added ? "أُضيفت إلى السلة" : "أضف إلى السلة"}
      </button>
      {added ? (
        <Link className="text-link" href="/cart">
          الانتقال إلى سلة المشتريات
        </Link>
      ) : null}
    </div>
  );
}
