// بخش فیلدهای داخل فرم را در فایل page.tsx به این شکل ساده کن:
<div className="login-form-container">
  <h2>{isLogin ? "ورود به سیستم" : "ایجاد حساب کاربری"}</h2>
  <form onSubmit={handleSubmit} style={{display:'flex', flexDirection:'column', gap:'12px', width:'100%'}}>
    
    <div className="inputBx">
      <input 
        type="email" 
        placeholder="آدرس ایمیل" 
        required 
        onChange={(e) => setFormData({...formData, email: e.target.value})} 
      />
    </div>

    {!isLogin && (
      <div className="inputBx">
        <input 
          type="text" 
          placeholder="نام و نام خانوادگی" 
          required 
          onChange={(e) => setFormData({...formData, username: e.target.value})} 
        />
      </div>
    )}

    <div className="inputBx">
      <input 
        type="password" 
        placeholder="رمز عبور" 
        required 
        onChange={(e) => setFormData({...formData, password: e.target.value})} 
      />
    </div>

    {error && <p style={{color:'#ff4d4d', fontSize:'12px', textAlign:'center'}}>{error}</p>}
    
    <div className="inputBx">
      <button type="submit" disabled={loading}>
        {loading ? "در حال پردازش..." : (isLogin ? "ورود" : "ثبت‌نام رایگان")}
      </button>
    </div>

    <p style={{color:'white', fontSize:'13px', cursor:'pointer', textAlign:'center', marginTop:'10px'}} 
       onClick={() => setIsLogin(!isLogin)}>
      {isLogin ? "هنوز حساب ندارید؟ عضو شوید" : "قبلاً عضو شده‌اید؟ وارد شوید"}
    </p>
  </form>
</div>
