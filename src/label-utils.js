/*
 * Truncate a string to n characters. If the input does not need to be
 * modified to satisfy the length limit, it will be returned without
 * modifications. If it does, it will be truncated to n characters, and
 * the nth character will be replaced with an ellipsis to indicate that
 * the original string extended beyond the truncated string.
 *
 * Examples:
 * shortenString("ab", 3)   === "ab"
 * shortenString("abc", 3)  === "abc"
 * shortenString("abcd", 3) === "ab…"
 */
exports.shortenString = (s, n) =>
    (s.length > n) ? s.substring(0, n-1) + '…' : s;
