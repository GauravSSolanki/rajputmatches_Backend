const maskMobile = (mobile) => {
  if (!mobile || mobile.length < 4) return mobile;
  const visibleLength = Math.floor(mobile.length / 2);
  return (
    mobile.slice(0, visibleLength) + "*".repeat(mobile.length - visibleLength)
  );
};

const maskEmail = (email) => {
  if (!email || !email.includes("@")) return email;
  const [local, domain] = email.split("@");
  const visibleLength = Math.floor(local.length / 2);
  return (
    local.slice(0, visibleLength) +
    "*".repeat(local.length - visibleLength) +
    "@" +
    domain
  );
};

module.exports = { maskMobile, maskEmail };
