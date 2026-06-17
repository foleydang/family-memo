// utils/holidays.js - 前端节假日工具
// 从后端获取节假日/节气/节日信息，缓存到storage

const CACHE_KEY = 'holidays_cache';

/**
 * 获取某月的节假日数据
 * 缓存到该年12月31日过期
 */
async function getMonthHolidays(year, month) {
  const app = getApp();
  const expireTime = new Date(year, 11, 31, 23, 59, 59).getTime();
  const cacheKey = `${CACHE_KEY}_${year}_${month}`;
  const cached = wx.getStorageSync(cacheKey);
  if (cached && cached.expire > Date.now()) {
    return cached.data;
  }
  
  try {
    const res = await app.request({
      url: '/holidays/month',
      data: { year, month }
    });
    
    if (res.success) {
      wx.setStorageSync(cacheKey, { data: res.data, expire: expireTime });
      return res.data;
    }
  } catch (err) {
    console.error('获取节假日失败:', err);
  }
  
  return {};
}

/**
 * 获取某日的标签信息（主标签+副标签）
 * 同一天可能同时有: 假日+节气、节气+节日 等
 * 返回 { primary: '端午', primaryClass: 'holiday-text', secondary: '夏至', secondaryClass: 'term-text' }
 * 或 null
 */
function getDayLabels(dateStr, monthHolidays) {
  const info = monthHolidays[dateStr];
  if (!info) return null;
  
  let primary = null, primaryClass = 'term-text';
  let secondary = null, secondaryClass = 'term-text';
  
  // 法定假日优先级最高
  if (info.holiday === true) {
    if (info.wage === 3) {
      const name = info.holidayName || '';
      if (name.includes('除夕')) primary = '除夕';
      else if (name.includes('初')) primary = '春节';
      else if (name.includes('清明')) primary = '清明';
      else if (name.includes('劳动')) primary = '劳动节';
      else if (name.includes('端午')) primary = '端午';
      else if (name.includes('中秋')) primary = '中秋';
      else if (name.includes('国庆')) primary = '国庆';
      else if (name.includes('元旦')) primary = '元旦';
      else primary = name;
      primaryClass = 'holiday-text';
    } else {
      primary = '休';
      primaryClass = 'rest-day';
    }
  } else if (info.holiday === false) {
    primary = '班';
    primaryClass = 'work-day';
  }
  
  // 节气：如果主标签已有假日，节气作为副标签
  if (info.term) {
    if (primary) {
      secondary = info.term;
      secondaryClass = 'term-text';
    } else {
      primary = info.term;
      primaryClass = 'term-text';
    }
  }
  
  // 纪念日：如果主标签已有，纪念日作为副标签
  if (info.festival) {
    if (primary) {
      if (!secondary) {
        secondary = info.festival;
        secondaryClass = 'festival-text';
      }
    } else {
      primary = info.festival;
      primaryClass = 'festival-text';
    }
  }
  
  if (!primary) return null;
  return { primary, primaryClass, secondary, secondaryClass };
}

module.exports = { getMonthHolidays, getDayLabels };
