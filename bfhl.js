function isInteger(n) {
  return Number.isInteger(n);
}

function fibonacciSeries(n) {
  if (n <= 0) return [];
  const res = [0];
  if (n === 1) return res;
  res.push(1);
  while (res.length < n) {
    const len = res.length;
    const next = res[len - 1] + res[len - 2];
    res.push(next);
  }
  return res.slice(0, n);
}

function isPrimeNum(n) {
  if (n <= 1) return false;
  if (n <= 3) return true;
  if (n % 2 === 0) return false;
  const r = Math.floor(Math.sqrt(n));
  for (let i = 3; i <= r; i += 2) {
    if (n % i === 0) return false;
  }
  return true;
}

function filterPrimes(arr) {
  return arr.filter((x) => isInteger(x) && isPrimeNum(x));
}

function gcd(a, b) {
  a = Math.abs(a);
  b = Math.abs(b);
  if (b === 0) return a;
  while (b) {
    const t = b;
    b = a % b;
    a = t;
  }
  return a;
}

function gcdArray(arr) {
  if (!arr.length) return 0;
  return arr.reduce((acc, v) => gcd(acc, v));
}

function lcm(a, b) {
  if (a === 0 || b === 0) return 0;
  return Math.abs((a / gcd(a, b)) * b);
}

function lcmArray(arr) {
  if (!arr.length) return 0;
  return arr.reduce((acc, v) => lcm(acc, v));
}

module.exports = {
  fibonacciSeries,
  filterPrimes,
  gcdArray,
  lcmArray,
  isInteger
};
