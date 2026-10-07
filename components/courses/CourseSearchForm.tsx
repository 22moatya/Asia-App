import type { CourseFilters } from "@/lib/course-catalog";

interface CategoryOption {
  name: string;
  slug: string;
}

export function CourseSearchForm({
  categories,
  filters,
}: {
  categories: CategoryOption[];
  filters: CourseFilters;
}) {
  return (
    <form action="/courses" className="course-filters" method="get">
      <div className="filter-search">
        <label htmlFor="course-search">ابحث عن دورة</label>
        <input
          autoComplete="off"
          defaultValue={filters.q}
          id="course-search"
          maxLength={100}
          name="q"
          placeholder="مثل: تطوير الويب"
          type="search"
        />
      </div>
      <label>
        التصنيف
        <select defaultValue={filters.category ?? ""} name="category">
          <option value="">كل التصنيفات</option>
          {categories.map((category) => (
            <option key={category.slug} value={category.slug}>
              {category.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        المستوى
        <select defaultValue={filters.level ?? ""} name="level">
          <option value="">كل المستويات</option>
          <option value="beginner">مبتدئ</option>
          <option value="intermediate">متوسط</option>
          <option value="advanced">متقدم</option>
        </select>
      </label>
      <label>
        التقييم
        <select
          defaultValue={filters.rating?.toString() ?? ""}
          name="rating"
        >
          <option value="">أي تقييم</option>
          <option value="4">٤ نجوم فأعلى</option>
          <option value="4.5">٤٫٥ نجوم فأعلى</option>
        </select>
      </label>
      <label>
        ترتيب حسب
        <select defaultValue={filters.sort} name="sort">
          <option value="latest">الأحدث</option>
          <option value="popular">الأكثر شعبية</option>
          <option value="rating">الأعلى تقييماً</option>
          <option value="price-asc">السعر: من الأقل للأعلى</option>
          <option value="price-desc">السعر: من الأعلى للأقل</option>
        </select>
      </label>
      <div className="price-filter">
        <label>
          أقل سعر
          <input
            defaultValue={filters.minPrice}
            inputMode="decimal"
            min="0"
            name="minPrice"
            placeholder="٠"
            step="0.01"
            type="number"
          />
        </label>
        <label>
          أعلى سعر
          <input
            defaultValue={filters.maxPrice}
            inputMode="decimal"
            min="0"
            name="maxPrice"
            placeholder="بدون حد"
            step="0.01"
            type="number"
          />
        </label>
      </div>
      <input name="page" type="hidden" value="1" />
      <button className="button button-primary filter-submit" type="submit">
        تطبيق البحث والتصفية
      </button>
    </form>
  );
}
