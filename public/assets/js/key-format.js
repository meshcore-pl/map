export const truncateKey = (key, visibleChars = 10) => `${key.slice(0, visibleChars)}...${key.slice(-visibleChars)}`;
