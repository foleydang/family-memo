// utils/holidays.js - 前端节假日工具
// 从后端获取节假日/节气/节日信息，缓存到storage

const app = getApp();

const CACHE_KEY = 'holidays_cache';
const CACHE_DURATION = 86400000; // 24小时

/**
 * 获取某月的节假日数据
 * @param {number} year 
 * @param {number} month (1-12)
 * @returns {object} { 'YYYY-MM-DD': { holiday, holidayName, term, festival, ... } }
 */
async function getMonthHolidays(year, month) {
  // 先检查缓存
  const cacheKey = `${CACHE_KEY}_${year}_${month}`;
  const cached = wx.getStorageSync(cacheKey);
  if (cached && Date.now() - cached.time < CACHE_DURATION) {
    return cached.data;
  }
  
  try {
    const res = await app.request({
      url: '/holidays/month',
      data: { year, month }
    });
    
    if (res.success) {
      wx.setStorageSync(cacheKey, { data: res.data, time: Date.now() });
      return res.data;
    }
  } catch (err) {
    console.error('获取节假日失败:', err);
  }
  
  return {};
}

/**
 * 获取某日的节假日标签（简短，用于日历格子显示）
 * @param {string} dateStr - YYYY-MM-DD
 * @param {object} monthHolidays - 该月节假日数据
 * @returns {string|null} - 如 "端午" / "芒种" / "儿童节"
 */
function getDayLabel(dateStr, monthHolidays) {
  const info = monthHolidays[dateStr];
  if (!info) return null;
  
  // 优先级: 法定假日 > 节气 > 纪念日
  if (info.holidayName) {
    // 简化名称：初一/初二等显示为"春节"，补班不显示
    if (info.holiday === false) return null; // 补班不标
    const name = info.holidayName;
    if (name.includes('初')) return '春节';
    if (name.includes('清明')) return '清明';
    if (name.includes('劳动')) return '劳动节';
    if (name.includes('端午')) return '端午';
    if (name.includes('中秋')) return '中秋';
    if (name.includes('国庆')) return '国庆';
    if (name.includes('元旦')) return '元旦';
    if (name.includes('除夕')) return '除夕';
    return name;
  }
  
  if (info.term) return info.term;
  if (info.festival) return info.festival;
  
  return null;
}

module.exports = { getMonthHolidays, getDayLabel };
