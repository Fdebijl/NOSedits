import { LOGLEVEL } from '@fdebijl/clog';

export const CONFIG = {
  MIN_LOGLEVEL: LOGLEVEL.DEBUG,
  MONGO_URL: process.env.MONGO_URL || 'mongodb://10.10.10.15:7071/nosedits',
  MOMENT: {
    LOCALE: 'nl'
  },
  PORT: 7676
}