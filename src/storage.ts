import type { LevelBoard, Point } from "./types";

var storagePrefix = "circuits.progress.";
var completionStoragePrefix = "circuits.completed.";

export function progressStorageKey(level: LevelBoard): string {
  return storagePrefix + gridHash(level);
}

export function completionStorageKey(level: LevelBoard): string {
  return completionStoragePrefix + gridHash(level);
}

function gridHash(level: LevelBoard): string {
  return sha256(gridFingerprint(level));
}

function gridFingerprint(level: LevelBoard): string {
  var pairs = level.nodes
    .map(function (pair) {
      return [nodeFingerprint(pair[0]), nodeFingerprint(pair[1])]
        .sort()
        .join("-");
    })
    .sort();

  return "size:" + level.size + ";nodes:" + pairs.join("|");
}

function nodeFingerprint(point: Point): string {
  return point.x + "," + point.y;
}

function sha256(message: string): string {
  var bytes = new TextEncoder().encode(message);
  var hash = new Uint32Array(8);
  var k = new Uint32Array([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1,
    0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
    0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
    0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
    0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
    0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
    0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
    0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
    0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ]);

  hash.set([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c,
    0x1f83d9ab, 0x5be0cd19,
  ]);

  var bitLength = bytes.length * 8;
  var paddedLength = Math.ceil((bytes.length + 9) / 64) * 64;
  var padded = new Uint8Array(paddedLength);
  var words = new Uint32Array(64);
  padded.set(bytes);
  padded[bytes.length] = 0x80;

  for (var i = 0; i < 8; i++) {
    padded[paddedLength - 1 - i] = Math.floor(bitLength / 2 ** (i * 8)) & 0xff;
  }

  for (var chunk = 0; chunk < padded.length; chunk += 64) {
    for (var word = 0; word < 16; word++) {
      var offset = chunk + word * 4;
      words[word] =
        (padded[offset] << 24) |
        (padded[offset + 1] << 16) |
        (padded[offset + 2] << 8) |
        padded[offset + 3];
    }

    for (var wordIndex = 16; wordIndex < 64; wordIndex++) {
      var s0 =
        rotateRight(words[wordIndex - 15], 7) ^
        rotateRight(words[wordIndex - 15], 18) ^
        (words[wordIndex - 15] >>> 3);
      var s1 =
        rotateRight(words[wordIndex - 2], 17) ^
        rotateRight(words[wordIndex - 2], 19) ^
        (words[wordIndex - 2] >>> 10);
      words[wordIndex] =
        (words[wordIndex - 16] + s0 + words[wordIndex - 7] + s1) >>> 0;
    }

    var a = hash[0];
    var b = hash[1];
    var c = hash[2];
    var d = hash[3];
    var e = hash[4];
    var f = hash[5];
    var g = hash[6];
    var h = hash[7];

    for (var round = 0; round < 64; round++) {
      var bigS1 = rotateRight(e, 6) ^ rotateRight(e, 11) ^ rotateRight(e, 25);
      var ch = (e & f) ^ (~e & g);
      var temp1 = (h + bigS1 + ch + k[round] + words[round]) >>> 0;
      var bigS0 = rotateRight(a, 2) ^ rotateRight(a, 13) ^ rotateRight(a, 22);
      var maj = (a & b) ^ (a & c) ^ (b & c);
      var temp2 = (bigS0 + maj) >>> 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    hash[0] = (hash[0] + a) >>> 0;
    hash[1] = (hash[1] + b) >>> 0;
    hash[2] = (hash[2] + c) >>> 0;
    hash[3] = (hash[3] + d) >>> 0;
    hash[4] = (hash[4] + e) >>> 0;
    hash[5] = (hash[5] + f) >>> 0;
    hash[6] = (hash[6] + g) >>> 0;
    hash[7] = (hash[7] + h) >>> 0;
  }

  return Array.from(hash)
    .map(function (value) {
      return value.toString(16).padStart(8, "0");
    })
    .join("");
}

function rotateRight(value: number, bits: number): number {
  return (value >>> bits) | (value << (32 - bits));
}
