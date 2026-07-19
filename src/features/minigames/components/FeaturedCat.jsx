export function FeaturedCat() {
  return (
    <svg className="featured-cat" viewBox="0 0 280 220" aria-hidden="true">
      <path
        className="featured-cat__body"
        d="M92 203c-17-27-21-58-13-91 7-29 26-49 51-58l-4-38 31 25c9-2 18-2 27 0l30-25-3 40c21 12 35 33 38 58 5 37-3 67-17 89h-33v-41c0-5-4-9-9-9s-9 4-9 9v41h-49v-40c0-5-4-9-9-9s-9 4-9 9v40H92Z"
      />
      <path
        className="featured-cat__tail"
        d="M100 185c-26 9-55 5-66-17-9-18-4-42 10-53 10-8 23-9 31-1 7 7 5 18-2 23-6 4-13 1-14-5-6 7-7 18-3 27 6 13 22 17 38 10"
      />
      <circle className="featured-cat__face" cx="158" cy="78" r="4" />
      <circle className="featured-cat__face" cx="188" cy="78" r="4" />
      <ellipse className="featured-cat__face" cx="173" cy="92" rx="5" ry="3.5" />
      <path className="featured-cat__sparkle featured-cat__sparkle--large" d="M235 53c2 11 7 16 18 18-11 2-16 7-18 18-2-11-7-16-18-18 11-2 16-7 18-18Z" />
      <path className="featured-cat__sparkle" d="M258 91c1 7 4 10 11 11-7 1-10 4-11 11-1-7-4-10-11-11 7-1 10-4 11-11Z" />
    </svg>
  );
}
