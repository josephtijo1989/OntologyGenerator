import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private isDarkSubject = new BehaviorSubject<boolean>(true);
  isDark$ = this.isDarkSubject.asObservable();

  toggleTheme(): void {
    const nextVal = !this.isDarkSubject.value;
    this.isDarkSubject.next(nextVal);
    if (nextVal) {
      document.body.classList.remove('light-theme');
      document.body.classList.add('dark-theme');
    } else {
      document.body.classList.remove('dark-theme');
      document.body.classList.add('light-theme');
    }
  }

  isDark(): boolean {
    return this.isDarkSubject.value;
  }
}
