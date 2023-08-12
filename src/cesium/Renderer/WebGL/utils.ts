
/**
  * cyrb53 hash for string from: https://stackoverflow.com/a/52171480
  *
  * Public Domain, @bryc - https://stackoverflow.com/users/815680/bryc
  *
  * It is roughly similar to the well-known MurmurHash/xxHash algorithms. It uses a combination
  * of multiplication and Xorshift to generate the hash, but not as thorough. As a result it's
  * faster than either would be in JavaScript and significantly simpler to implement. Keep in
  * mind this is not a secure algorithm, if privacy/security is a concern, this is not for you.
  *
  * @param {string} str
  * @param {number} seed, default 0
  * @returns number
  */
const hashString = (str: string, seed = 0): number => {
    let h1 = 0xdeadbeef ^ seed; let h2 = 0x41c6ce57 ^ seed;

    for (let i = 0, ch; i < str.length; i++) {
        ch = str.charCodeAt(i);

        h1 = Math.imul(h1 ^ ch, 2654435761);

        h2 = Math.imul(h2 ^ ch, 1597334677);
    }

    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);

    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);

    return 4294967296 * (2097151 & h2) + (h1 >>> 0);
};

export {hashString };
