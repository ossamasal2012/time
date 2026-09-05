/* =========================================================
   تحدّي الثانية — Game Logic
   ========================================================= */

(function () {
  "use strict";

  /* ---------------- Data ---------------- */

  // Exact target-number pool as provided by the game designer (verbatim, unmodified).
  var TARGET_NUMBERS_RAW = "14.00 / 0.50 / 13.99 / 0.51 / 13.98 / 0.52 / 13.97 / 0.53 / 13.96 / 0.54 / 13.95 / 0.55 / 13.94 / 0.56 / 13.93 / 0.57 / 13.92 / 0.58 / 13.91 / 0.59 / 13.90 / 0.60 / 13.89 / 0.61 / 13.88 / 0.62 / 13.87 / 0.63 / 13.86 / 0.64 / 13.85 / 0.65 / 13.84 / 0.66 / 13.83 / 0.67 / 13.82 / 0.68 / 13.81 / 0.69 / 13.80 / 0.70 / 13.79 / 0.71 / 13.78 / 0.72 / 13.77 / 0.73 / 13.76 / 0.74 / 13.75 / 0.75 / 13.74 / 0.76 / 13.73 / 0.77 / 13.72 / 0.78 / 13.71 / 0.79 / 13.70 / 0.80 / 13.69 / 0.81 / 13.68 / 0.82 / 13.67 / 0.83 / 13.66 / 0.84 / 13.65 / 0.85 / 13.64 / 0.86 / 13.63 / 0.87 / 13.62 / 0.88 / 13.61 / 0.89 / 13.60 / 0.90 / 13.59 / 0.91 / 13.58 / 0.92 / 13.57 / 0.93 / 13.56 / 0.94 / 13.55 / 0.95 / 13.54 / 0.96 / 13.53 / 0.97 / 13.52 / 0.98 / 13.51 / 0.99 / 13.50 / 1.00 / 13.49 / 1.01 / 13.48 / 1.02 / 13.47 / 1.03 / 13.46 / 1.04 / 13.45 / 1.05 / 13.44 / 1.06 / 13.43 / 1.07 / 13.42 / 1.08 / 13.41 / 1.09 / 13.40 / 1.10 / 13.39 / 1.11 / 13.38 / 1.12 / 13.37 / 1.13 / 13.36 / 1.14 / 13.35 / 1.15 / 13.34 / 1.16 / 13.33 / 1.17 / 13.32 / 1.18 / 13.31 / 1.19 / 13.30 / 1.20 / 13.29 / 1.21 / 13.28 / 1.22 / 13.27 / 1.23 / 13.26 / 1.24 / 13.25 / 1.25 / 13.24 / 1.26 / 13.23 / 1.27 / 13.22 / 1.28 / 13.21 / 1.29 / 13.20 / 1.30 / 13.19 / 1.31 / 13.18 / 1.32 / 13.17 / 1.33 / 13.16 / 1.34 / 13.15 / 1.35 / 13.14 / 1.36 / 13.13 / 1.37 / 13.12 / 1.38 / 13.11 / 1.39 / 13.10 / 1.40 / 13.09 / 1.41 / 13.08 / 1.42 / 13.07 / 1.43 / 13.06 / 1.44 / 13.05 / 1.45 / 13.04 / 1.46 / 13.03 / 1.47 / 13.02 / 1.48 / 13.01 / 1.49 / 13.00 / 1.50 / 12.99 / 1.51 / 12.98 / 1.52 / 12.97 / 1.53 / 12.96 / 1.54 / 12.95 / 1.55 / 12.94 / 1.56 / 12.93 / 1.57 / 12.92 / 1.58 / 12.91 / 1.59 / 12.90 / 1.60 / 12.89 / 1.61 / 12.88 / 1.62 / 12.87 / 1.63 / 12.86 / 1.64 / 12.85 / 1.65 / 12.84 / 1.66 / 12.83 / 1.67 / 12.82 / 1.68 / 12.81 / 1.69 / 12.80 / 1.70 / 12.79 / 1.71 / 12.78 / 1.72 / 12.77 / 1.73 / 12.76 / 1.74 / 12.75 / 1.75 / 12.74 / 1.76 / 12.73 / 1.77 / 12.72 / 1.78 / 12.71 / 1.79 / 12.70 / 1.80 / 12.69 / 1.81 / 12.68 / 1.82 / 12.67 / 1.83 / 12.66 / 1.84 / 12.65 / 1.85 / 12.64 / 1.86 / 12.63 / 1.87 / 12.62 / 1.88 / 12.61 / 1.89 / 12.60 / 1.90 / 12.59 / 1.91 / 12.58 / 1.92 / 12.57 / 1.93 / 12.56 / 1.94 / 12.55 / 1.95 / 12.54 / 1.96 / 12.53 / 1.97 / 12.52 / 1.98 / 12.51 / 1.99 / 12.50 / 2.00 / 12.49 / 2.01 / 12.48 / 2.02 / 12.47 / 2.03 / 12.46 / 2.04 / 12.45 / 2.05 / 12.44 / 2.06 / 12.43 / 2.07 / 12.42 / 2.08 / 12.41 / 2.09 / 12.40 / 2.10 / 12.39 / 2.11 / 12.38 / 2.12 / 12.37 / 2.13 / 12.36 / 2.14 / 12.35 / 2.15 / 12.34 / 2.16 / 12.33 / 2.17 / 12.32 / 2.18 / 12.31 / 2.19 / 12.30 / 2.20 / 12.29 / 2.21 / 12.28 / 2.22 / 12.27 / 2.23 / 12.26 / 2.24 / 12.25 / 2.25 / 12.24 / 2.26 / 12.23 / 2.27 / 12.22 / 2.28 / 12.21 / 2.29 / 12.20 / 2.30 / 12.19 / 2.31 / 12.18 / 2.32 / 12.17 / 2.33 / 12.16 / 2.34 / 12.15 / 2.35 / 12.14 / 2.36 / 12.13 / 2.37 / 12.12 / 2.38 / 12.11 / 2.39 / 12.10 / 2.40 / 12.09 / 2.41 / 12.08 / 2.42 / 12.07 / 2.43 / 12.06 / 2.44 / 12.05 / 2.45 / 12.04 / 2.46 / 12.03 / 2.47 / 12.02 / 2.48 / 12.01 / 2.49 / 12.00 / 2.50 / 11.99 / 2.51 / 11.98 / 2.52 / 11.97 / 2.53 / 11.96 / 2.54 / 11.95 / 2.55 / 11.94 / 2.56 / 11.93 / 2.57 / 11.92 / 2.58 / 11.91 / 2.59 / 11.90 / 2.60 / 11.89 / 2.61 / 11.88 / 2.62 / 11.87 / 2.63 / 11.86 / 2.64 / 11.85 / 2.65 / 11.84 / 2.66 / 11.83 / 2.67 / 11.82 / 2.68 / 11.81 / 2.69 / 11.80 / 2.70 / 11.79 / 2.71 / 11.78 / 2.72 / 11.77 / 2.73 / 11.76 / 2.74 / 11.75 / 2.75 / 11.74 / 2.76 / 11.73 / 2.77 / 11.72 / 2.78 / 11.71 / 2.79 / 11.70 / 2.80 / 11.69 / 2.81 / 11.68 / 2.82 / 11.67 / 2.83 / 11.66 / 2.84 / 11.65 / 2.85 / 11.64 / 2.86 / 11.63 / 2.87 / 11.62 / 2.88 / 11.61 / 2.89 / 11.60 / 2.90 / 11.59 / 2.91 / 11.58 / 2.92 / 11.57 / 2.93 / 11.56 / 2.94 / 11.55 / 2.95 / 11.54 / 2.96 / 11.53 / 2.97 / 11.52 / 2.98 / 11.51 / 2.99 / 11.50 / 3.00 / 11.49 / 3.01 / 11.48 / 3.02 / 11.47 / 3.03 / 11.46 / 3.04 / 11.45 / 3.05 / 11.44 / 3.06 / 11.43 / 3.07 / 11.42 / 3.08 / 11.41 / 3.09 / 11.40 / 3.10 / 11.39 / 3.11 / 11.38 / 3.12 / 11.37 / 3.13 / 11.36 / 3.14 / 11.35 / 3.15 / 11.34 / 3.16 / 11.33 / 3.17 / 11.32 / 3.18 / 11.31 / 3.19 / 11.30 / 3.20 / 11.29 / 3.21 / 11.28 / 3.22 / 11.27 / 3.23 / 11.26 / 3.24 / 11.25 / 3.25 / 11.24 / 3.26 / 11.23 / 3.27 / 11.22 / 3.28 / 11.21 / 3.29 / 11.20 / 3.30 / 11.19 / 3.31 / 11.18 / 3.32 / 11.17 / 3.33 / 11.16 / 3.34 / 11.15 / 3.35 / 11.14 / 3.36 / 11.13 / 3.37 / 11.12 / 3.38 / 11.11 / 3.39 / 11.10 / 3.40 / 11.09 / 3.41 / 11.08 / 3.42 / 11.07 / 3.43 / 11.06 / 3.44 / 11.05 / 3.45 / 11.04 / 3.46 / 11.03 / 3.47 / 11.02 / 3.48 / 11.01 / 3.49 / 11.00 / 3.50 / 10.99 / 3.51 / 10.98 / 3.52 / 10.97 / 3.53 / 10.96 / 3.54 / 10.95 / 3.55 / 10.94 / 3.56 / 10.93 / 3.57 / 10.92 / 3.58 / 10.91 / 3.59 / 10.90 / 3.60 / 10.89 / 3.61 / 10.88 / 3.62 / 10.87 / 3.63 / 10.86 / 3.64 / 10.85 / 3.65 / 10.84 / 3.66 / 10.83 / 3.67 / 10.82 / 3.68 / 10.81 / 3.69 / 10.80 / 3.70 / 10.79 / 3.71 / 10.78 / 3.72 / 10.77 / 3.73 / 10.76 / 3.74 / 10.75 / 3.75 / 10.74 / 3.76 / 10.73 / 3.77 / 10.72 / 3.78 / 10.71 / 3.79 / 10.70 / 3.80 / 10.69 / 3.81 / 10.68 / 3.82 / 10.67 / 3.83 / 10.66 / 3.84 / 10.65 / 3.85 / 10.64 / 3.86 / 10.63 / 3.87 / 10.62 / 3.88 / 10.61 / 3.89 / 10.60 / 3.90 / 10.59 / 3.91 / 10.58 / 3.92 / 10.57 / 3.93 / 10.56 / 3.94 / 10.55 / 3.95 / 10.54 / 3.96 / 10.53 / 3.97 / 10.52 / 3.98 / 10.51 / 3.99 / 10.50 / 4.00 / 10.49 / 4.01 / 10.48 / 4.02 / 10.47 / 4.03 / 10.46 / 4.04 / 10.45 / 4.05 / 10.44 / 4.06 / 10.43 / 4.07 / 10.42 / 4.08 / 10.41 / 4.09 / 10.40 / 4.10 / 10.39 / 4.11 / 10.38 / 4.12 / 10.37 / 4.13 / 10.36 / 4.14 / 10.35 / 4.15 / 10.34 / 4.16 / 10.33 / 4.17 / 10.32 / 4.18 / 10.31 / 4.19 / 10.30 / 4.20 / 10.29 / 4.21 / 10.28 / 4.22 / 10.27 / 4.23 / 10.26 / 4.24 / 10.25 / 4.25 / 10.24 / 4.26 / 10.23 / 4.27 / 10.22 / 4.28 / 10.21 / 4.29 / 10.20 / 4.30 / 10.19 / 4.31 / 10.18 / 4.32 / 10.17 / 4.33 / 10.16 / 4.34 / 10.15 / 4.35 / 10.14 / 4.36 / 10.13 / 4.37 / 10.12 / 4.38 / 10.11 / 4.39 / 10.10 / 4.40 / 10.09 / 4.41 / 10.08 / 4.42 / 10.07 / 4.43 / 10.06 / 4.44 / 10.05 / 4.45 / 10.04 / 4.46 / 10.03 / 4.47 / 10.02 / 4.48 / 10.01 / 4.49 / 10.00 / 4.50 / 9.99 / 4.51 / 9.98 / 4.52 / 9.97 / 4.53 / 9.96 / 4.54 / 9.95 / 4.55 / 9.94 / 4.56 / 9.93 / 4.57 / 9.92 / 4.58 / 9.91 / 4.59 / 9.90 / 4.60 / 9.89 / 4.61 / 9.88 / 4.62 / 9.87 / 4.63 / 9.86 / 4.64 / 9.85 / 4.65 / 9.84 / 4.66 / 9.83 / 4.67 / 9.82 / 4.68 / 9.81 / 4.69 / 9.80 / 4.70 / 9.79 / 4.71 / 9.78 / 4.72 / 9.77 / 4.73 / 9.76 / 4.74 / 9.75 / 4.75 / 9.74 / 4.76 / 9.73 / 4.77 / 9.72 / 4.78 / 9.71 / 4.79 / 9.70 / 4.80 / 9.69 / 4.81 / 9.68 / 4.82 / 9.67 / 4.83 / 9.66 / 4.84 / 9.65 / 4.85 / 9.64 / 4.86 / 9.63 / 4.87 / 9.62 / 4.88 / 9.61 / 4.89 / 9.60 / 4.90 / 9.59 / 4.91 / 9.58 / 4.92 / 9.57 / 4.93 / 9.56 / 4.94 / 9.55 / 4.95 / 9.54 / 4.96 / 9.53 / 4.97 / 9.52 / 4.98 / 9.51 / 4.99 / 9.50 / 5.00 / 9.49 / 5.01 / 9.48 / 5.02 / 9.47 / 5.03 / 9.46 / 5.04 / 9.45 / 5.05 / 9.44 / 5.06 / 9.43 / 5.07 / 9.42 / 5.08 / 9.41 / 5.09 / 9.40 / 5.10 / 9.39 / 5.11 / 9.38 / 5.12 / 9.37 / 5.13 / 9.36 / 5.14 / 9.35 / 5.15 / 9.34 / 5.16 / 9.33 / 5.17 / 9.32 / 5.18 / 9.31 / 5.19 / 9.30 / 5.20 / 9.29 / 5.21 / 9.28 / 5.22 / 9.27 / 5.23 / 9.26 / 5.24 / 9.25 / 5.25 / 9.24 / 5.26 / 9.23 / 5.27 / 9.22 / 5.28 / 9.21 / 5.29 / 9.20 / 5.30 / 9.19 / 5.31 / 9.18 / 5.32 / 9.17 / 5.33 / 9.16 / 5.34 / 9.15 / 5.35 / 9.14 / 5.36 / 9.13 / 5.37 / 9.12 / 5.38 / 9.11 / 5.39 / 9.10 / 5.40 / 9.09 / 5.41 / 9.08 / 5.42 / 9.07 / 5.43 / 9.06 / 5.44 / 9.05 / 5.45 / 9.04 / 5.46 / 9.03 / 5.47 / 9.02 / 5.48 / 9.01 / 5.49 / 9.00 / 5.50 / 8.99 / 5.51 / 8.98 / 5.52 / 8.97 / 5.53 / 8.96 / 5.54 / 8.95 / 5.55 / 8.94 / 5.56 / 8.93 / 5.57 / 8.92 / 5.58 / 8.91 / 5.59 / 8.90 / 5.60 / 8.89 / 5.61 / 8.88 / 5.62 / 8.87 / 5.63 / 8.86 / 5.64 / 8.85 / 5.65 / 8.84 / 5.66 / 8.83 / 5.67 / 8.82 / 5.68 / 8.81 / 5.69 / 8.80 / 5.70 / 8.79 / 5.71 / 8.78 / 5.72 / 8.77 / 5.73 / 8.76 / 5.74 / 8.75 / 5.75 / 8.74 / 5.76 / 8.73 / 5.77 / 8.72 / 5.78 / 8.71 / 5.79 / 8.70 / 5.80 / 8.69 / 5.81 / 8.68 / 5.82 / 8.67 / 5.83 / 8.66 / 5.84 / 8.65 / 5.85 / 8.64 / 5.86 / 8.63 / 5.87 / 8.62 / 5.88 / 8.61 / 5.89 / 8.60 / 5.90 / 8.59 / 5.91 / 8.58 / 5.92 / 8.57 / 5.93 / 8.56 / 5.94 / 8.55 / 5.95 / 8.54 / 5.96 / 8.53 / 5.97 / 8.52 / 5.98 / 8.51 / 5.99 / 8.50 / 6.00 / 8.49 / 6.01 / 8.48 / 6.02 / 8.47 / 6.03 / 8.46 / 6.04 / 8.45 / 6.05 / 8.44 / 6.06 / 8.43 / 6.07 / 8.42 / 6.08 / 8.41 / 6.09 / 8.40 / 6.10 / 8.39 / 6.11 / 8.38 / 6.12 / 8.37 / 6.13 / 8.36 / 6.14 / 8.35 / 6.15 / 8.34 / 6.16 / 8.33 / 6.17 / 8.32 / 6.18 / 8.31 / 6.19 / 8.30 / 6.20 / 8.29 / 6.21 / 8.28 / 6.22 / 8.27 / 6.23 / 8.26 / 6.24 / 8.25 / 6.25 / 8.24 / 6.26 / 8.23 / 6.27 / 8.22 / 6.28 / 8.21 / 6.29 / 8.20 / 6.30 / 8.19 / 6.31 / 8.18 / 6.32 / 8.17 / 6.33 / 8.16 / 6.34 / 8.15 / 6.35 / 8.14 / 6.36 / 8.13 / 6.37 / 8.12 / 6.38 / 8.11 / 6.39 / 8.10 / 6.40 / 8.09 / 6.41 / 8.08 / 6.42 / 8.07 / 6.43 / 8.06 / 6.44 / 8.05 / 6.45 / 8.04 / 6.46 / 8.03 / 6.47 / 8.02 / 6.48 / 8.01 / 6.49 / 8.00 / 6.50 / 7.99 / 6.51 / 7.98 / 6.52 / 7.97 / 6.53 / 7.96 / 6.54 / 7.95 / 6.55 / 7.94 / 6.56 / 7.93 / 6.57 / 7.92 / 6.58 / 7.91 / 6.59 / 7.90 / 6.60 / 7.89 / 6.61 / 7.88 / 6.62 / 7.87 / 6.63 / 7.86 / 6.64 / 7.85 / 6.65 / 7.84 / 6.66 / 7.83 / 6.67 / 7.82 / 6.68 / 7.81 / 6.69 / 7.80 / 6.70 / 7.79 / 6.71 / 7.78 / 6.72 / 7.77 / 6.73 / 7.76 / 6.74 / 7.75 / 6.75 / 7.74 / 6.76 / 7.73 / 6.77 / 7.72 / 6.78 / 7.71 / 6.79 / 7.70 / 6.80 / 7.69 / 6.81 / 7.68 / 6.82 / 7.67 / 6.83 / 7.66 / 6.84 / 7.65 / 6.85 / 7.64 / 6.86 / 7.63 / 6.87 / 7.62 / 6.88 / 7.61 / 6.89 / 7.60 / 6.90 / 7.59 / 6.91 / 7.58 / 6.92 / 7.57 / 6.93 / 7.56 / 6.94 / 7.55 / 6.95 / 7.54 / 6.96 / 7.53 / 6.97 / 7.52 / 6.98 / 7.51 / 6.99 / 7.50 / 7.00 / 7.49 / 7.01 / 7.48 / 7.02 / 7.47 / 7.03 / 7.46 / 7.04 / 7.45 / 7.05 / 7.44 / 7.06 / 7.43 / 7.07 / 7.42 / 7.08 / 7.41 / 7.09 / 7.40 / 7.10 / 7.39 / 7.11 / 7.38 / 7.12 / 7.37 / 7.13 / 7.36 / 7.14 / 7.35 / 7.15 / 7.34 / 7.16 / 7.33 / 7.17 / 7.32 / 7.18 / 7.31 / 7.19 / 7.30 / 7.20 / 7.29 / 7.21 / 7.28 / 7.22 / 7.27 / 7.23 / 7.26 / 7.24 / 7.25";

  var TARGET_NUMBERS = TARGET_NUMBERS_RAW.split("/").map(function (s) {
    return parseFloat(s.trim());
  });

  // Background music playlist. Add more file paths here later and the
  // player will automatically cycle through all of them in order, then loop.
  var PLAYLIST = ["assets/audio/dwarven-mine.mp3"];

  var SETTINGS_KEY = "tth_settings_v1";

  /* ---------------- State ---------------- */

  var state = {
    players: [],
    currentIndex: 0,
    round: 1,
    target: null,
    timerRunning: false,
    startTs: 0,
    pendingCount: null,
    musicWasPlayingBeforeGame: false,
    soundOn: true,
    musicVolume: 0.6,
    currentTrackIndex: 0
  };

  /* ---------------- DOM shortcuts ---------------- */

  var $ = function (id) { return document.getElementById(id); };

  var musicEl = $("bg-music");

  /* ---------------- Settings persistence ---------------- */

  function saveSettings() {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify({
        volume: state.musicVolume,
        soundOn: state.soundOn
      }));
    } catch (e) { /* ignore (private mode, etc.) */ }
  }

  function loadSettings() {
    try {
      var raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) {
        var s = JSON.parse(raw);
        if (typeof s.volume === "number") state.musicVolume = s.volume;
        if (typeof s.soundOn === "boolean") state.soundOn = s.soundOn;
      }
    } catch (e) { /* ignore */ }
  }

  /* ---------------- Screen / modal navigation ---------------- */

  function showScreen(id) {
    var screens = document.querySelectorAll(".screen");
    for (var i = 0; i < screens.length; i++) screens[i].classList.remove("active");
    $(id).classList.add("active");
  }

  function openModal(id) { $(id).classList.add("open"); }
  function closeModal(id) { $(id).classList.remove("open"); }

  document.querySelectorAll(".modal-close").forEach(function (btn) {
    btn.addEventListener("click", function () {
      closeModal(btn.getAttribute("data-close"));
    });
  });

  // Close a modal by tapping its dark backdrop (outside the sheet).
  document.querySelectorAll(".modal").forEach(function (modal) {
    modal.addEventListener("click", function (e) {
      if (e.target === modal) closeModal(modal.id);
    });
  });

  function showConfirm(message, onYes) {
    $("confirm-message").textContent = message;
    openModal("confirm-modal");
    var yesBtn = $("confirm-yes");
    var noBtn = $("confirm-no");

    function cleanup() {
      yesBtn.removeEventListener("click", onYesHandler);
      noBtn.removeEventListener("click", onNoHandler);
      closeModal("confirm-modal");
    }
    function onYesHandler() { cleanup(); onYes(); }
    function onNoHandler() { cleanup(); }

    yesBtn.addEventListener("click", onYesHandler);
    noBtn.addEventListener("click", onNoHandler);
  }

  /* ---------------- Click sound effect (synthesized, no audio file needed) ---------------- */

  var audioCtx = null;
  function ensureCtx() {
    if (!audioCtx) {
      var Ctx = window.AudioContext || window.webkitAudioContext;
      if (Ctx) audioCtx = new Ctx();
    }
    return audioCtx;
  }

  function playClickSound() {
    try {
      var ctx = ensureCtx();
      if (!ctx) return;
      if (ctx.state === "suspended") ctx.resume();
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(820, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(380, ctx.currentTime + 0.09);
      gain.gain.setValueAtTime(0.16, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.11);
    } catch (e) { /* ignore */ }
  }

  document.addEventListener("click", function (e) {
    var btn = e.target.closest(".btn, button");
    if (btn) playClickSound();
  }, true);

  /* ---------------- Music manager ---------------- */

  function initMusic() {
    musicEl.loop = PLAYLIST.length === 1;
    musicEl.src = PLAYLIST[state.currentTrackIndex];
    musicEl.volume = state.musicVolume;

    if (PLAYLIST.length > 1) {
      musicEl.addEventListener("ended", function () {
        state.currentTrackIndex = (state.currentTrackIndex + 1) % PLAYLIST.length;
        musicEl.src = PLAYLIST[state.currentTrackIndex];
        musicEl.play().catch(function () {});
      });
    }

    updateMusicToggleIcon();
    var slider = $("volume-slider");
    slider.value = state.musicVolume;
    updateSliderFill(slider);
  }

  function tryPlayMusic() {
    if (!state.soundOn) return;
    var p = musicEl.play();
    if (p && p.catch) {
      p.catch(function () {
        // Autoplay was blocked — resume automatically on the very first tap.
        var resume = function () {
          musicEl.play().catch(function () {});
          document.removeEventListener("pointerdown", resume);
        };
        document.addEventListener("pointerdown", resume, { once: true });
      });
    }
  }

  function pauseMusic() { musicEl.pause(); }

  function updateMusicToggleIcon() {
    var isPlaying = state.soundOn && !musicEl.paused;
    $("icon-play").style.display = isPlaying ? "none" : "";
    $("icon-pause").style.display = isPlaying ? "" : "none";
  }

  $("music-toggle").addEventListener("click", function () {
    if (musicEl.paused) {
      state.soundOn = true;
      tryPlayMusic();
    } else {
      state.soundOn = false;
      pauseMusic();
    }
    updateMusicToggleIcon();
    saveSettings();
  });

  function updateSliderFill(slider) {
    var pct = Math.round(parseFloat(slider.value) * 100) + "%";
    slider.style.setProperty("--fill", pct);
  }

  $("volume-slider").addEventListener("input", function (e) {
    state.musicVolume = parseFloat(e.target.value);
    musicEl.volume = state.musicVolume;
    updateSliderFill(e.target);
    saveSettings();
  });

  /* ---------------- Main menu ---------------- */

  $("btn-play").addEventListener("click", function () {
    state.pendingCount = null;
    document.querySelectorAll(".count-badge").forEach(function (b) { b.classList.remove("selected"); });
    $("count-next-btn").disabled = true;
    goToSetupStep("count");
    showScreen("setup-screen");
  });

  $("btn-howto").addEventListener("click", function () { openModal("howto-modal"); });
  $("btn-sound").addEventListener("click", function () { openModal("sound-modal"); });

  /* ---------------- Player setup ---------------- */

  var setupStep = "count";

  function goToSetupStep(step) {
    setupStep = step;
    document.querySelectorAll(".setup-step").forEach(function (s) { s.classList.remove("active"); });
    $("setup-step-" + step).classList.add("active");
    $("setup-title").textContent = step === "count" ? "عدد اللاعبين" : "أسماء اللاعبين";
  }

  $("setup-back-btn").addEventListener("click", function () {
    if (setupStep === "names") {
      goToSetupStep("count");
    } else {
      showScreen("main-menu");
    }
  });

  // Build the 1–10 player-count grid once.
  (function buildCountGrid() {
    var grid = $("count-grid");
    for (var n = 1; n <= 10; n++) {
      (function (n) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "btn count-badge";
        b.textContent = n;
        b.addEventListener("click", function () {
          document.querySelectorAll(".count-badge").forEach(function (x) { x.classList.remove("selected"); });
          b.classList.add("selected");
          state.pendingCount = n;
          $("count-next-btn").disabled = false;
        });
        grid.appendChild(b);
      })(n);
    }
  })();

  $("count-next-btn").addEventListener("click", function () {
    if (!state.pendingCount) return;
    buildNameInputs(state.pendingCount);
    goToSetupStep("names");
  });

  function buildNameInputs(n) {
    var wrap = $("names-wrap");
    wrap.innerHTML = "";
    for (var i = 1; i <= n; i++) {
      var row = document.createElement("div");
      row.className = "name-row";

      var badge = document.createElement("span");
      badge.className = "player-badge";
      badge.textContent = i;

      var input = document.createElement("input");
      input.type = "text";
      input.className = "name-input";
      input.maxLength = 16;
      input.placeholder = "اسم اللاعب " + i;
      input.setAttribute("data-index", i);

      row.appendChild(badge);
      row.appendChild(input);
      wrap.appendChild(row);
    }
  }

  $("start-game-btn").addEventListener("click", function () {
    var inputs = document.querySelectorAll(".name-input");
    state.players = Array.prototype.map.call(inputs, function (inp, idx) {
      var val = inp.value.trim();
      return { name: val || ("اللاعب " + (idx + 1)), score: 0 };
    });
    state.currentIndex = 0;
    state.round = 1;
    state.musicWasPlayingBeforeGame = state.soundOn && !musicEl.paused;
    pauseMusic();
    startNewRound();
    showScreen("game-screen");
  });

  /* ---------------- Game round logic ---------------- */

  function pickRandomTarget() {
    var i = Math.floor(Math.random() * TARGET_NUMBERS.length);
    return TARGET_NUMBERS[i];
  }

  function currentPlayer() { return state.players[state.currentIndex]; }

  function startNewRound() {
    state.target = pickRandomTarget();
    state.timerRunning = false;
    renderGameTurn();
  }

  function renderGameTurn() {
    $("round-label").textContent = "الجولة " + state.round;
    $("current-player-name").textContent = currentPlayer().name;
    $("current-player-score").textContent = currentPlayer().score;
    $("target-number").textContent = state.target.toFixed(2);

    var timerDisplay = $("timer-display");
    timerDisplay.textContent = "--.--";
    timerDisplay.classList.remove("revealed", "running");

    var banner = $("result-banner");
    banner.textContent = "";
    banner.classList.remove("show", "hit", "miss");

    $("next-turn-btn").classList.remove("show");

    var startStopBtn = $("start-stop-btn");
    startStopBtn.textContent = "ابدأ";
    startStopBtn.classList.remove("is-stop");
    startStopBtn.disabled = false;
  }

  $("start-stop-btn").addEventListener("click", function () {
    var btn = $("start-stop-btn");
    var timerDisplay = $("timer-display");

    if (!state.timerRunning) {
      // START — begin the hidden ascending count.
      state.timerRunning = true;
      state.startTs = performance.now();
      timerDisplay.textContent = "···";
      timerDisplay.classList.add("running");
      btn.textContent = "توقف";
      btn.classList.add("is-stop");
      return;
    }

    // STOP — capture the elapsed time immediately, with no delay.
    var elapsedMs = performance.now() - state.startTs;
    state.timerRunning = false;
    var elapsedSec = Math.round((elapsedMs / 1000) * 100) / 100;

    timerDisplay.textContent = elapsedSec.toFixed(2);
    timerDisplay.classList.remove("running");
    timerDisplay.classList.add("revealed");
    btn.disabled = true;

    var isHit = Math.abs(elapsedSec - state.target) < 0.001;
    if (isHit) {
      currentPlayer().score += 1;
      $("current-player-score").textContent = currentPlayer().score;
    }

    var banner = $("result-banner");
    banner.textContent = isHit ? "🎯 إصابة تامة! +1 نقطة" : "لم تُصب الرقم — حاول في الجولة القادمة";
    banner.classList.toggle("hit", isHit);
    banner.classList.toggle("miss", !isHit);
    banner.classList.add("show");

    $("next-turn-btn").classList.add("show");
  });

  $("next-turn-btn").addEventListener("click", function () {
    state.currentIndex++;
    if (state.currentIndex >= state.players.length) {
      state.currentIndex = 0;
      state.round++;
      startNewRound();
    } else {
      renderGameTurn();
    }
  });

  /* ---------------- Rankings ---------------- */

  function escapeHtml(str) {
    var map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
    return String(str).replace(/[&<>"']/g, function (c) { return map[c]; });
  }

  function renderRankings() {
    var sorted = state.players.slice().sort(function (a, b) { return b.score - a.score; });
    var list = $("rankings-list");
    var html = "";
    for (var i = 0; i < sorted.length; i++) {
      html += '<li class="rank-row">' +
                '<span class="rank-pos">' + (i + 1) + '</span>' +
                '<span class="rank-name">' + escapeHtml(sorted[i].name) + '</span>' +
                '<span class="rank-score">' + sorted[i].score + '</span>' +
              '</li>';
    }
    list.innerHTML = html;
  }

  $("rankings-btn").addEventListener("click", function () {
    renderRankings();
    openModal("rankings-modal");
  });

  /* ---------------- Exit game ---------------- */

  $("exit-game-btn").addEventListener("click", function () {
    showConfirm("هل تريد إنهاء اللعبة الحالية والعودة للقائمة الرئيسية؟", function () {
      showScreen("main-menu");
      if (state.musicWasPlayingBeforeGame) tryPlayMusic();
    });
  });

  /* ---------------- Boot sequence ---------------- */

  window.addEventListener("DOMContentLoaded", function () {
    loadSettings();
    initMusic();

    setTimeout(function () {
      $("splash-screen").classList.add("fade-out");
      setTimeout(function () {
        $("splash-screen").style.display = "none";
        showScreen("main-menu");
        tryPlayMusic();
      }, 500);
    }, 2000);
  });

})();
