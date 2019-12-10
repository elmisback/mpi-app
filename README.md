# mpi-app

This is a clone of a scammer's rendition of a research application. Please do not use it for treatment.

I stumbled across [this absurdly-priced knockoff app](https://casafuturatech.com/mpistutter/) which appears to be based on [this paper](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4610276/). The paper studies the effect of modifying phonation intervals (MPI) through biofeedback as a possible treatment for adults who stutter, and concludes that MPI is not significantly more effective than prolonged speech treatment. Footnote 7 of the paper actually calls out the knockoff app as a "crude imitation" of the research application.

Bizarre origin story aside, cloning the scam app based on video alone was a fun challenge. It was interesting learning what phonation is (sustained sound at a relatively musical frequency) and how to distinguish it from the noise of wind/"hissing" (frequency filtering with a Fourier transform). "Zzzzz" sounds were the most tricky to detect because they are phonated but involve a lot of hissing, too.
